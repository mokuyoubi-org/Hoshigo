// ============================================================
// constants/plans.ts
// プラン定義（Android / Web 共通）
// ============================================================

export type PlanTier = 'start' | 'plus' | 'ultra';

export type Plan = {
  tier: PlanTier;
  planId: number;          // DB の plan_id: 0=Start, 1=Plus, 2=Ultra
  name: string;
  description: string;
  features: string[];
  androidMonthlyId: string;
  androidYearlyId: string;
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    tier: 'start',
    planId: 0,
    name: 'Start',
    description: 'まず試したい方に',
    features: [
      '基本機能すべて利用可能',
      '月5GBストレージ',
      'メールサポート',
    ],
    androidMonthlyId: '',
    androidYearlyId: '',
    stripeMonthlyPriceId: '',
    stripeYearlyPriceId: '',
  },
  {
    tier: 'plus',
    planId: 1,
    name: 'Plus',
    description: 'もっと活用したい方に',
    features: [
      'Startの全機能',
      '月50GBストレージ',
      '優先サポート',
      'カスタムテーマ',
    ],
    androidMonthlyId: 'hoshigo_plus:monthly-base',
    androidYearlyId: 'hoshigo_plus:yearly-base',
    stripeMonthlyPriceId: 'price_1TERr4HB6HAtRQbPFhUJrMjA',
    stripeYearlyPriceId: 'price_1TERr3HB6HAtRQbPdr9olppJ',
    highlighted: true,
  },
  {
    tier: 'ultra',
    planId: 2,
    name: 'Ultra',
    description: 'フル活用したい方に',
    features: [
      'Plusの全機能',
      '無制限ストレージ',
      '24時間チャットサポート',
      'APIアクセス',
      'チームメンバー招待',
    ],
    androidMonthlyId: 'hoshigo_ultra:monthly-base',
    androidYearlyId: 'hoshigo_ultra:yearly-base',
    stripeMonthlyPriceId: 'price_1TES2mHB6HAtRQbPUXlbqn6z',
    stripeYearlyPriceId: 'price_1TES2lHB6HAtRQbPHqw2palY',
  },
];

// productId（Android）から plan_id を引くマップ
// "hoshigo_plus:monthly-base" → 1 など
export const ANDROID_PRODUCT_TO_PLAN_ID: Record<string, number> = Object.fromEntries(
  PLANS.flatMap((p) => [
    [p.androidMonthlyId, p.planId],
    [p.androidYearlyId, p.planId],
  ]).filter(([id]) => id !== '')
);

// Stripe の priceId から plan_id を引くマップ
export const STRIPE_PRICE_TO_PLAN_ID: Record<string, number> = Object.fromEntries(
  PLANS.flatMap((p) => [
    [p.stripeMonthlyPriceId, p.planId],
    [p.stripeYearlyPriceId, p.planId],
  ]).filter(([id]) => id !== '')
);