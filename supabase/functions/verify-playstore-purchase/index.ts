// supabase/functions/verify-purchase/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// サービスロールで操作するリモコン（plan_id 更新用）
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Androidアプリ「星碁」のパッケージ名
const PACKAGE_NAME = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');

// Android の productId → plan_id マップ
const ANDROID_PRODUCT_TO_PLAN_ID: Record<string, number> = {
  'hoshigo_plus': 1,
  'hoshigo_ultra': 2,
};

// ============================================================
// 1. Google Play Developer API 用のアクセストークンを取得
// Web Crypto API (crypto.subtle) で JWT を自前署名する
// ============================================================
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')!;
  const serviceAccount = JSON.parse(serviceAccountJson);

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const signingInput = `${base64url(header)}.${base64url(payload)}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`アクセストークンの取得に失敗しました: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ============================================================
// 2. Google Play Developer API でサブスク購入情報を取得・検証
// ============================================================
async function getSubscriptionPurchase(
  subscriptionId: string,
  purchaseToken: string,
  accessToken: string
) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Play API エラー: ${res.status} ${body}`);
  }

  return await res.json();
}

// ============================================================
// 3. users.profiles の plan_id を更新
// ============================================================
async function updatePlanId(uid: string, planId: number) {
  const { error } = await supabase
    .schema('users')
    .from('profiles')
    .update({ plan_id: planId })
    .eq('uid', uid);

  if (error) throw new Error(`plan_id 更新失敗: ${error.message}`);
  console.log(`[verify-purchase] uid=${uid} plan_id=${planId} に更新しました`);
}

// ============================================================
// エントリーポイント
// ============================================================
Deno.serve(async (req) => {
  // POST 以外は拒否
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // --------------------------------------------------------
    // 認証: Supabase JWT からログイン中のユーザーの uid を取得
    // --------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ユーザーのJWTでクライアントを作り直してgetUserする
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
    console.log(`[verify-purchase] uid=${uid} からリクエスト受信`);

    // --------------------------------------------------------
    // リクエストボディのパース
    // --------------------------------------------------------
    const body = await req.json();
    const { purchaseToken, subscriptionId } = body;

    if (!purchaseToken || !subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'purchaseToken と subscriptionId は必須です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-purchase] subscriptionId=${subscriptionId} を検証します`);

    // --------------------------------------------------------
    // Google Play API でレシートを検証
    // --------------------------------------------------------
    const accessToken = await getAccessToken();
    const purchase = await getSubscriptionPurchase(subscriptionId, purchaseToken, accessToken);

    console.log('[verify-purchase] Google Play API レスポンス:', JSON.stringify(purchase));

    // subscriptionState の確認
    // SUBSCRIPTION_STATE_ACTIVE / SUBSCRIPTION_STATE_IN_GRACE_PERIOD → 有効
    // それ以外 → 無効
    const subscriptionState = purchase?.subscriptionState;
    const isActive =
      subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' ||
      subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';

    if (!isActive) {
      console.log(`[verify-purchase] サブスクが有効ではありません: ${subscriptionState}`);
      return new Response(
        JSON.stringify({ success: false, reason: 'subscription_not_active' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------
    // plan_id を更新
    // --------------------------------------------------------
    // subscriptionId から productId 部分を取り出す
    // 例: "hoshigo_plus:monthly-base" → "hoshigo_plus"
    const productIdBase = subscriptionId.split(':')[0];
    const planId = ANDROID_PRODUCT_TO_PLAN_ID[productIdBase];

    if (planId === undefined) {
      console.error('[verify-purchase] 不明な subscriptionId:', subscriptionId);
      return new Response(
        JSON.stringify({ success: false, reason: 'unknown_product' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updatePlanId(uid, planId);
    const { error: tokenError } = await supabase
      .schema('users')
      .from('profiles')
      .update({ purchase_token: purchaseToken })
      .eq('uid', uid);

    if (tokenError) {
      console.error('[verify-purchase] purchase_token 保存失敗:', tokenError.message);
    }

    return new Response(
      JSON.stringify({ success: true, planId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[verify-purchase] エラー:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});