// ============================================================
// supabase/functions/get-stripe-prices/index.ts
// Stripe から価格情報を取得して Expo Web に返す Edge Function
//
// レスポンス例:
// {
//   "prices": [
//     {
//       "priceId": "price_1TERr4HB6HAtRQbPFhUJrMjA",
//       "productId": "prod_UCraDbWJhVIuk7",
//       "amount": 300,
//       "currency": "jpy",
//       "interval": "month",
//       "formatted": "¥300"
//     },
//     ...
//   ]
// }
// ============================================================

// この Stripe はStripeの公式ライブラリ
import Stripe from 'https://esm.sh/stripe@14?target=deno';

// この stripe はStripeとやりとりするためのリモコン
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-01-28.clover',
  httpClient: Stripe.createFetchHttpClient(),
});

// const CORS_HEADERS = {
//   'Access-Control-Allow-Origin': 'https://hoshigo.app',
//   'Access-Control-Allow-Methods': 'GET, OPTIONS',
//   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
// };

// CORS_HEADERSは、expo→efでもef→stripeでもなく、ef→expoの時に、「このデータ、このURLなら読んでいいですよ！」つけるラベル

// corsはブラウザを守るためのもの
const CORS_HEADERS = {
  // どのurlなら読んでいいか
  // * はどのurlでもok
  'Access-Control-Allow-Origin': '*',
  // httpメソッドのうち、getだけ許可する
  // optionsは事前確認。つまりcorsは2回送られるし、そもそもhttp通信というのも二回おこなわれるもの
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  // このヘッダなら送っていいよ、というブラウザへの許可
  /*
  事前に聞くOPTIONS
  「Authorizationつけていい？」

  EF「
  Access-Control-Allow-Headers: Authorization」

  ブラウザ：「OK送るにゃん」
  */
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};



// 取得対象の Price ID（ホワイトリスト）
const PRICE_IDS = [
  'price_1TERr4HB6HAtRQbPFhUJrMjA', // Plus monthly
  'price_1TERr3HB6HAtRQbPdr9olppJ', // Plus yearly
  'price_1TES2mHB6HAtRQbPUXlbqn6z', // Ultra monthly
  'price_1TES2lHB6HAtRQbPHqw2palY', // Ultra yearly
];

/* 金額を通貨に応じてフォーマット 
price.unit_amount = 300
currency = "jpy"
↓
￥300
*/
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount);
}


// EFの入り口。リクエストが来たらこれを実行する。メイン関数
Deno.serve(async (req: Request) => {
  // 204は「成功だけど返す中身ないよ」ってこと
  // あくまでefでは判定しないで、corsに、つまりはブラウザに任せている
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // corsでもget以外は禁止しているが、そもそもcorsはブラウザ保護のための仕組みであって、サーバ保護の仕組みではないから、このように、サーバはサーバで自分のことを守る必要がある
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  // ここからが処理の本体
  try {
    
    // 4つのPriceIdについて、それぞれ
    // stripe.prices.retrieve()
    // 関数を実行している
    const priceResults = await 
    // Promise.all([...])は、全部同時に実行して全部終わるまで待つ
    Promise.all(
      PRICE_IDS.map((id) => stripe.prices.retrieve(id)),
    );

    const prices = priceResults.map((price) => ({
      priceId: price.id,
      productId: price.product as string,
      // Stripe の amount は最小通貨単位（JPY は 1円単位なのでそのまま）
      amount: price.unit_amount ?? 0,
      currency: price.currency,
      interval: price.recurring?.interval ?? null,       // 'month' | 'year'
      intervalCount: price.recurring?.interval_count ?? 1,
      formatted: formatAmount(price.unit_amount ?? 0, price.currency),
    }));

    return new Response(
      JSON.stringify({ prices }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[get-stripe-prices] error:', message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});