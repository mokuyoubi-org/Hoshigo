// ============================================================
// supabase/functions/verify-apple-purchase/index.ts
// Expoから購入直後に呼ばれ、App Store Server APIでレシートを検証し
// plan_idを更新するEdge Function
//
// 呼び出し元: IAPProvider.tsx の verifyApplePurchase()
// 受け取るもの: { originalTransactionId, productId }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// iOS の productId → plan_id マップ
// plans.ts の IOS_PRODUCT_TO_PLAN_ID と対応させる
const IOS_PRODUCT_TO_PLAN_ID: Record<string, number> = {
  [Deno.env.get('HOSHIGO_PLUS_IOS_MONTHLY_PRODUCT_ID')!]: 1,
  [Deno.env.get('HOSHIGO_PLUS_IOS_YEARLY_PRODUCT_ID')!]: 1,
  // Ultraを解禁する時に追加:
  // [Deno.env.get('HOSHIGO_ULTRA_IOS_MONTHLY_PRODUCT_ID')!]: 2,
  // [Deno.env.get('HOSHIGO_ULTRA_IOS_YEARLY_PRODUCT_ID')!]: 2,
};

// ============================================================
// 1. App Store Server API 用の JWT を生成する
//
// GoogleのJWT生成とほぼ同じ構造だが、Appleは ES256（楕円曲線）を使う。
// GoogleはRS256（RSA）だった点だけが違う。
// ============================================================
async function generateAppleJWT(): Promise<string> {
  const privateKey = Deno.env.get('APPLE_IAP_PRIVATE_KEY')!; // .p8の中身（-----BEGIN PRIVATE KEY-----を含む）
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID')!;           // App Store ConnectのKey ID（10文字）
  const issuerId = Deno.env.get('APPLE_IAP_ISSUER_ID')!;     // App Store ConnectのIssuer ID（UUID）
  const bundleId = Deno.env.get('APPLE_IAP_BUNDLE_ID')!;     // アプリのbundleIdentifier

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 3600,
    aud: 'appstoreconnect-v1',
    bid: bundleId,
  };

  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const signingInput = `${base64url(header)}.${base64url(payload)}`;

  // PEM → CryptoKey（ES256 = ECDSA P-256）
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;

  return jwt;
}

// ============================================================
// 2. App Store Server API でトランザクション情報を取得・検証する
//
// GET /inApps/v1/transactions/{transactionId}
// ============================================================
async function getTransactionInfo(
  originalTransactionId: string,
  jwt: string
): Promise<{ productId: string; status: number } | null> {
  // 本番環境のエンドポイント（Sandboxは api.storekit-sandbox.itunes.apple.com）
  const url = `https://api.storekit.itunes.apple.com/inApps/v1/subscriptions/${originalTransactionId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  // 404 の場合はSandboxで再試行（TestFlightビルドからの購入に対応）
  if (res.status === 404) {
    console.log('[verify-apple-purchase] 本番で404、Sandboxで再試行します');
    const sandboxRes = await fetch(
      `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/subscriptions/${originalTransactionId}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    if (!sandboxRes.ok) {
      const body = await sandboxRes.text();
      throw new Error(`Sandbox App Store API エラー: ${sandboxRes.status} ${body}`);
    }
    return parseTransactionResponse(await sandboxRes.json());
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`App Store Server API エラー: ${res.status} ${body}`);
  }

  return parseTransactionResponse(await res.json());
}

function parseTransactionResponse(data: unknown): { productId: string; status: number } | null {
  // レスポンスの data[0].lastTransactions[0] にサブスク状態が入っている
  // status: 1=アクティブ, 2=期限切れ, 3=請求の問題, 4=猶予期間, 5=取り消し
  const typed = data as {
    data?: Array<{
      lastTransactions?: Array<{ productId: string; status: number }>;
    }>;
  };
  const lastTransaction = typed?.data?.[0]?.lastTransactions?.[0];
  if (!lastTransaction) return null;
  return {
    productId: lastTransaction.productId,
    status: lastTransaction.status,
  };
}

// ============================================================
// 3. users.profiles の plan_id を更新する
// ============================================================
async function updatePlanId(uid: string, planId: number) {
  const { error } = await supabase
    .schema('users')
    .from('profiles')
    .update({ plan_id: planId })
    .eq('uid', uid);
  if (error) throw new Error(`plan_id 更新失敗: ${error.message}`);
  console.log(`[verify-apple-purchase] uid=${uid} plan_id=${planId} に更新しました`);
}

// ============================================================
// エントリーポイント
// ============================================================
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // ── 認証: Supabase JWT からログイン中のユーザーのuidを取得 ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '認証に失敗しました' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uid = user.id;
    console.log(`[verify-apple-purchase] uid=${uid} からリクエスト受信`);

    // ── リクエストボディのパース ──
    const body = await req.json();
    const { originalTransactionId, productId } = body;

    if (!originalTransactionId || !productId) {
      return new Response(
        JSON.stringify({ error: 'originalTransactionId と productId は必須です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-apple-purchase] originalTransactionId=${originalTransactionId} を検証します`);

    // ── App Store Server API でトランザクションを検証 ──
    const jwt = await generateAppleJWT();
    const transaction = await getTransactionInfo(originalTransactionId, jwt);

    if (!transaction) {
      console.error('[verify-apple-purchase] トランザクション情報が取得できません');
      return new Response(
        JSON.stringify({ success: false, reason: 'transaction_not_found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-apple-purchase] トランザクション:', JSON.stringify(transaction));

    // status: 1=アクティブ, 4=猶予期間（グレースピリオド） → 有効とみなす
    const isActive = transaction.status === 1 || transaction.status === 4;
    if (!isActive) {
      console.log(`[verify-apple-purchase] サブスクが有効ではありません: status=${transaction.status}`);
      return new Response(
        JSON.stringify({ success: false, reason: 'subscription_not_active' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── plan_id を更新 ──
    const planId = IOS_PRODUCT_TO_PLAN_ID[transaction.productId];
    if (planId === undefined) {
      console.error('[verify-apple-purchase] 不明な productId:', transaction.productId);
      return new Response(
        JSON.stringify({ success: false, reason: 'unknown_product' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updatePlanId(uid, planId);

    // purchase_token（originalTransactionId）を保存
    // google-play-webhookのフォールバックと同じ役割：
    // apple-webhookでappAccountTokenが取れない時にDBから引くために使う
    const { error: tokenError } = await supabase
      .schema('users')
      .from('profiles')
      .update({ purchase_token: originalTransactionId })
      .eq('uid', uid);

    if (tokenError) {
      console.error('[verify-apple-purchase] purchase_token 保存失敗:', tokenError.message);
    }

    return new Response(
      JSON.stringify({ success: true, planId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[verify-apple-purchase] エラー:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});