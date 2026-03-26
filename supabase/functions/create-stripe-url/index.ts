// ============================================================
// supabase/functions/create-stripe-url/index.ts
// uid を受け取り Stripe Checkout URL を返す Edge Function
//
// ============================================================

import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://hoshigo.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ALLOWED_PRICE_IDS = new Set([
  'price_1TERr4HB6HAtRQbPFhUJrMjA', // Plus monthly
  'price_1TERr3HB6HAtRQbPdr9olppJ', // Plus yearly
  'price_1TES2mHB6HAtRQbPUXlbqn6z', // Ultra monthly
  'price_1TES2lHB6HAtRQbPHqw2palY', // Ultra yearly
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { priceId, successUrl, cancelUrl, uid } = await req.json();

    // バリデーション
    if (!priceId || !successUrl || !cancelUrl || !uid) {
      return new Response(
        JSON.stringify({ error: 'priceId, successUrl, cancelUrl, uid は必須です' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      return new Response(
        JSON.stringify({ error: '無効な priceId です' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // uid を metadata に埋め込む → webhook で取り出してDBを更新する
      metadata: {
        supabase_uid: uid,
      },
      // サブスクにも metadata を伝播させる
      subscription_data: {
        metadata: {
          supabase_uid: uid,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[create-stripe-url] error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});