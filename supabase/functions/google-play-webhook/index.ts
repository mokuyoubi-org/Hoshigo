// ============================================================
// supabase/functions/google-play-webhook/index.ts
// Google Play Real-time Developer Notifications を受け取り
// plan_id を更新する Edge Function
// ============================================================
// import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JWT } from 'https://esm.sh/google-auth-library@9?target=deno';
// テーブル操作のために使うリモコン
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Androidアプリ「星碁」のパッケージ名
const PACKAGE_NAME = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');
// Android の productId → plan_id マップ
// basePlanId は含まれないので productId 部分だけで判定する
// そもそもbasePlanは年額か月額かなのでプランには関係ない
const ANDROID_PRODUCT_TO_PLAN_ID = {
  'hoshigo_plus': 1,
  'hoshigo_ultra': 2
};
// 1. Google Play Developer API 用のアクセストークンを取得
// googleくんとやりとりするためには、まず通行証を取りに行く必要がある。僕は正式なgoogle service accountですよ！って証明しに行く。
async function getAccessToken() {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  const serviceAccount = JSON.parse(serviceAccountJson);
  const jwt = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
      'https://www.googleapis.com/auth/androidpublisher'
    ]
  });
  const token = await jwt.getAccessToken();
  if (!token.token) throw new Error('アクセストークンの取得に失敗しました');
  return token.token;
}
// 2. Google Play Developer API でサブスク購入情報を取得
// 通行証(アクセストークン)を入手して初めて、「ねね、googleくんさあ、このレシートって本物？」って確かめにいける。
async function getSubscriptionPurchase(productId, purchaseToken, accessToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Play API エラー: ${res.status} ${body}`);
  }
  return await res.json();
}
// 3. users.profiles の plan_id を更新
// これはrpcでもいいかもしれない。
async function updatePlanId(uid, planId) {
  const { error } = await supabase.schema('users').from('profiles').update({
    plan_id: planId
  }).eq('uid', uid);
  if (error) throw new Error(`plan_id 更新失敗: ${error.message}`);
  console.log(`[google-play-webhook] uid=${uid} plan_id=${planId} に更新しました`);
}
// ここが処理の入り口
// reqはplaystoreから受け取る情報
Deno.serve(async (req)=>{
  // もしリクエストの種類がpostでなければ拒否
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405
    });
  }
  // 処理開始
  try {
    // Pub/Sub メッセージは Base64 エンコードされている
    // reqのbody
    const body = await req.json();
    // bodyの中のmessageの中のdata
    const messageData = body?.message?.data;
    // もしdataがなければ400
    // 400は「送ってきた内容がおかしいよ！」という意味
    if (!messageData) {
      return new Response('Invalid Pub/Sub message', {
        status: 400
      });
    }
    // atobは、base64っていう暗号を、文字列に戻している
    const notification = JSON.parse(atob(messageData));
    console.log('[google-play-webhook] 通知受信:', JSON.stringify(notification));
    const { subscriptionNotification, packageName } = notification;
    // subscriptionNotification 以外（テスト通知など）は無視
    if (!subscriptionNotification) {
      console.log('[google-play-webhook] subscriptionNotification なし、スキップ');
      return new Response(JSON.stringify({
        received: true
      }), {
        status: 200
      });
    }
    // ようやく、ここからが本番。
    const { notificationType, purchaseToken, subscriptionId } = subscriptionNotification;
    // notificationType の意味:
    // 1 = SUBSCRIPTION_RECOVERED
    // 2 = SUBSCRIPTION_RENEWED
    // 3 = SUBSCRIPTION_CANCELED (まだ有効期間中)
    // 4 = SUBSCRIPTION_PURCHASED  ← 新規購入
    // 12 = SUBSCRIPTION_EXPIRED   ← 完全に期限切れ
    // 13 = SUBSCRIPTION_REVOKED   ← 取り消し
    console.log('[google-play-webhook] notificationType:', notificationType, 'subscriptionId:', subscriptionId);
    // 1. 通行証(アクセストークン)を取りに行く
    const accessToken = await getAccessToken();
    // 2. アクセストークンを入手して初めてGoogleくんにレシートが本物か聞きに行ける。聞きに行く。
    const purchase = await getSubscriptionPurchase(subscriptionId, purchaseToken, accessToken);
    // ★ ★ ★ 大事 ★ ★ ★
    // obfuscatedExternalAccountId に Supabase の uid が入っている
    // それをuidに入れる
    const uid = purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (!uid) {
      console.error('[google-play-webhook] uid が取得できません');
      return new Response(JSON.stringify({
        received: true
      }), {
        status: 200
      });
    }
    // subscriptionId から productId 部分を取り出す（例: "hoshigo_plus:monthly-base" → "hoshigo_plus"）
    const productIdBase = subscriptionId.split(':')[0];
    const planId = ANDROID_PRODUCT_TO_PLAN_ID[productIdBase];
    if (notificationType === 4 || notificationType === 1 || notificationType === 2) {
      // 新規購入 / 復活 / 更新 → plan_id を設定
      if (planId === undefined) {
        console.error('[google-play-webhook] 不明な subscriptionId:', subscriptionId);
      } else {
        // 3. ついにここでアップデートする
        await updatePlanId(uid, planId);
      }
    } else if (notificationType === 12 || notificationType === 13) {
      // 3. 期限切れ / 取り消し → Start プラン（0）に戻す
      await updatePlanId(uid, 0);
    } else {
      console.log('[google-play-webhook] 処理不要の notificationType:', notificationType);
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[google-play-webhook] エラー:', message);
    return new Response(`Error: ${message}`, {
      status: 500
    });
  }
});
