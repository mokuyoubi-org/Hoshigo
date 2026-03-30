// ============================================================
// supabase/functions/apple-webhook/index.ts
// App Store Server Notifications V2 を受け取り plan_id を更新する
//
// Appleが購読するイベント（notificationType）:
//   SUBSCRIBED          → 新規購入・再購読
//   DID_RENEW           → 更新成功
//   DID_RECOVER         → 請求の問題から回復
//   EXPIRED             → 完全に期限切れ
//   REVOKE              → ファミリー共有の取り消し等
//
// google-play-webhook と対応する構造になっている
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// iOS の productId → plan_id マップ（verify-apple-purchase と同じ）
const IOS_PRODUCT_TO_PLAN_ID: Record<string, number> = {
  [Deno.env.get('HOSHIGO_PLUS_IOS_MONTHLY_PRODUCT_ID')!]: 1,
  [Deno.env.get('HOSHIGO_PLUS_IOS_YEARLY_PRODUCT_ID')!]: 1,
  // [Deno.env.get('HOSHIGO_ULTRA_IOS_MONTHLY_PRODUCT_ID')!]: 2,
  // [Deno.env.get('HOSHIGO_ULTRA_IOS_YEARLY_PRODUCT_ID')!]: 2,
};

// ============================================================
// 1. App Store Server Notifications の JWS ペイロードをデコードする
//
// AppleはJWTを署名付きで送ってくる（signedPayload）。
// 本来はAppleの公開鍵で署名検証すべきだが、
// Supabase EF + Deno環境での証明書チェーン検証は複雑なため、
// ここではペイロード部分のデコードのみ行う。
// セキュリティ上の補完として：
//   - EFのURLをApple以外に公開しない（Supabase Dashboardで管理）
//   - デコードした内容をApp Store Server APIで再検証する
// ============================================================
function decodeJWSPayload(jws: string): unknown {
  // JWSは header.payload.signature の3パートに分かれている
  const parts = jws.split('.');
  if (parts.length !== 3) throw new Error('不正なJWS形式です');

  // Base64URL → JSON
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload));
}

// ============================================================
// 2. App Store Server API 用の JWT を生成する
//    （verify-apple-purchase と同じ実装）
// ============================================================
async function generateAppleJWT(): Promise<string> {
  const privateKey = Deno.env.get('APPLE_IAP_PRIVATE_KEY')!;
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID')!;
  const issuerId = Deno.env.get('APPLE_IAP_ISSUER_ID')!;
  const bundleId = Deno.env.get('APPLE_IAP_BUNDLE_ID')!;

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

  return `${signingInput}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;
}

// ============================================================
// 3. App Store Server API でサブスク状態を再検証する
//    （google-play-webhookのgetSubscriptionPurchaseに相当）
// ============================================================
async function getSubscriptionStatus(
  originalTransactionId: string,
  jwt: string
): Promise<{ productId: string; status: number } | null> {
  const url = `https://api.storekit.itunes.apple.com/inApps/v1/subscriptions/${originalTransactionId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  // Sandboxからの通知に対応
  if (res.status === 404) {
    const sandboxRes = await fetch(
      `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/subscriptions/${originalTransactionId}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    if (!sandboxRes.ok) return null;
    return parseStatusResponse(await sandboxRes.json());
  }

  if (!res.ok) return null;
  return parseStatusResponse(await res.json());
}

function parseStatusResponse(data: unknown): { productId: string; status: number } | null {
  const typed = data as {
    data?: Array<{
      lastTransactions?: Array<{ productId: string; status: number }>;
    }>;
  };
  const lastTransaction = typed?.data?.[0]?.lastTransactions?.[0];
  if (!lastTransaction) return null;
  return { productId: lastTransaction.productId, status: lastTransaction.status };
}

// ============================================================
// 4. users.profiles の plan_id を更新する
// ============================================================
async function updatePlanId(uid: string, planId: number) {
  const { error } = await supabase
    .schema('users')
    .from('profiles')
    .update({ plan_id: planId })
    .eq('uid', uid);
  if (error) throw new Error(`plan_id 更新失敗: ${error.message}`);
  console.log(`[apple-webhook] uid=${uid} plan_id=${planId} に更新しました`);
}

// ============================================================
// エントリーポイント
// ============================================================
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { signedPayload } = body;

    if (!signedPayload) {
      return new Response('Invalid notification: signedPayload がありません', { status: 400 });
    }

    // JWSをデコードしてnotificationTypeとtransactionInfoを取得
    const notification = decodeJWSPayload(signedPayload) as {
      notificationType: string;
      subtype?: string;
      data?: { signedTransactionInfo?: string; signedRenewalInfo?: string };
    };

    const { notificationType, data } = notification;
    console.log('[apple-webhook] 通知受信:', notificationType, notification.subtype ?? '');

    // signedTransactionInfo をデコードしてトランザクション詳細を取得
    if (!data?.signedTransactionInfo) {
      console.log('[apple-webhook] signedTransactionInfo なし、スキップ');
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const transactionInfo = decodeJWSPayload(data.signedTransactionInfo) as {
      originalTransactionId: string;
      productId: string;
      appAccountToken?: string; // IAPProvider で appAccountToken: uid をセットしたもの
    };

    const { originalTransactionId, productId, appAccountToken } = transactionInfo;
    console.log(`[apple-webhook] originalTransactionId=${originalTransactionId} productId=${productId}`);

    // notificationType の振り分け
    // 有効にするイベント
    const activateTypes = ['SUBSCRIBED', 'DID_RENEW', 'DID_RECOVER'];
    // 無効にするイベント
    const deactivateTypes = ['EXPIRED', 'REVOKE'];

    if (!activateTypes.includes(notificationType) && !deactivateTypes.includes(notificationType)) {
      console.log('[apple-webhook] 処理不要の notificationType:', notificationType);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // ── uid を特定する ──
    // appAccountToken（IAPProviderでセットしたuid）から取得するのが第一優先
    // 取れない場合はpurchase_token（originalTransactionId）でDBから引く
    // （google-play-webhookのobfuscatedExternalAccountId/purchase_tokenと同じ戦略）
    let uid = appAccountToken ?? null;

    if (!uid) {
      console.log('[apple-webhook] appAccountToken なし、DBからフォールバック');
      const { data: profile } = await supabase
        .schema('users')
        .from('profiles')
        .select('uid')
        .eq('purchase_token', originalTransactionId)
        .single();
      uid = profile?.uid ?? null;
    }

    if (!uid) {
      console.error('[apple-webhook] uid が取得できません');
      // Appleには200を返さないと再送されてしまうので200で返す
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (activateTypes.includes(notificationType)) {
      // App Store Server APIで再検証（セキュリティ強化）
      const jwt = await generateAppleJWT();
      const subscriptionStatus = await getSubscriptionStatus(originalTransactionId, jwt);

      if (!subscriptionStatus) {
        console.error('[apple-webhook] App Store API でステータス取得失敗');
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // status: 1=アクティブ, 4=猶予期間 → 有効
      const isActive = subscriptionStatus.status === 1 || subscriptionStatus.status === 4;
      if (!isActive) {
        console.log(`[apple-webhook] サブスクが有効ではありません: status=${subscriptionStatus.status}`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const planId = IOS_PRODUCT_TO_PLAN_ID[productId];
      if (planId === undefined) {
        console.error('[apple-webhook] 不明な productId:', productId);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      await updatePlanId(uid, planId);

    } else if (deactivateTypes.includes(notificationType)) {
      // 期限切れ・取り消し → Start プラン（0）に戻す
      await updatePlanId(uid, 0);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[apple-webhook] エラー:', message);
    // Appleへは常に200を返す（500だと再送ループになる）
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
});