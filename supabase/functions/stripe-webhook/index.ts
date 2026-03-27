// ============================================================
// supabase/functions/stripe-webhook/index.ts
// Stripe からの Webhook を受け取り plan_id を更新する
//
// Stripe で購読するイベント:
//   checkout.session.completed     → 初回購入完了
//   customer.subscription.deleted  → 解約
// ============================================================
// importしとく
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// stripe は Stripe とやりとりするためのリモコン
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2026-01-28.clover',
  httpClient: Stripe.createFetchHttpClient()
});
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Stripe の priceId → plan_id マップ
const STRIPE_PRICE_TO_PLAN_ID = {
  'price_1TERr4HB6HAtRQbPFhUJrMjA': 1,
  'price_1TERr3HB6HAtRQbPdr9olppJ': 1,
  'price_1TES2mHB6HAtRQbPUXlbqn6z': 2,
  'price_1TES2lHB6HAtRQbPHqw2palY': 2
};
async function updatePlanId(uid, planId) {
  const { error } = await supabase.schema('users').from('profiles').update({
    plan_id: planId
  }).eq('uid', uid);
  if (error) {
    throw new Error(`plan_id の更新に失敗: ${error.message}`);
  }
  console.log(`[stripe-webhook] uid=${uid} plan_id=${planId} に更新しました`);
}
// ここが処理の入り口
// reqはStripeから送られてくる情報
Deno.serve(async (req)=>{
  // リクエストがpostでなければ拒否
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405
    });
  }
  // Stripeくんは「私が本物のStripeですよ」っていうサインをwebhookと一緒に送ってくる
  const signature = req.headers.get('stripe-signature');
  // もしサインがなければ🐱「誰だお前！帰れ！」猫激おこ。
  if (!signature) {
    return new Response('Missing stripe-signature header', {
      status: 400
    });
  }
  // ここまできたということは、ちゃんとサインは存在した
  const body = await req.text();
  let event;
  try {
    // 送られてきたデータ(body)が本当にStripeから来たのかどうか確認。
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe-webhook] 署名検証失敗:', message);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400
    });
  }
  console.log('[stripe-webhook] イベント受信:', event.type);
  // ここまできたということは本物のStripeくんだった
  try {
    // イベントの種類によって分岐処理
    switch(event.type){
      // ── 初回購入完了 ──────────────────────────────────────
      case 'checkout.session.completed':
        {
          // sessionの中にsupabaseのuidが入っている
          const session = event.data.object;
          const uid = session.metadata?.supabase_uid;
          // もしuidがなければダメ🙅
          if (!uid) {
            console.error('[stripe-webhook] metadata に supabase_uid がありません');
            break;
          }
          // line_items から priceId を取得
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          if (!priceId) {
            console.error('[stripe-webhook] priceId が取得できません');
            break;
          }
          const planId = STRIPE_PRICE_TO_PLAN_ID[priceId];
          if (planId === undefined) {
            console.error('[stripe-webhook] 不明な priceId:', priceId);
            break;
          }
          // ここでようやくsupabaseのユーザの状態を更新できる✨
          await updatePlanId(uid, planId);
          break;
        }
      // ── 解約・期限切れ ────────────────────────────────────
      case 'customer.subscription.deleted':
        {
          const subscription = event.data.object;
          const uid = subscription.metadata?.supabase_uid;
          if (!uid) {
            console.error('[stripe-webhook] metadata に supabase_uid がありません');
            break;
          }
          // Start プラン（0）に戻す
          await updatePlanId(uid, 0);
          break;
        }
      default:
        console.log('[stripe-webhook] 未処理のイベント:', event.type);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe-webhook] 処理エラー:', message);
    return new Response(`Webhook handler error: ${message}`, {
      status: 500
    });
  }
  return new Response(JSON.stringify({
    received: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
