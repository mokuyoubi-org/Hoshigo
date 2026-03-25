// ============================================================
// constants/plans.ts
// プラン定義（Android / Web 共通）
// ============================================================

export type PlanTier = "start" | "plus" | "ultra";

export type Plan = {
  tier: PlanTier;
  planId: number; // DB の plan_id: 0=Start, 1=Plus, 2=Ultra
  name: string;
  description: string;
  features: string[];
  // Android: Google Play の Product ID（fetchProducts に渡す）
  androidProductId: string;
  // Android: ベースプランID（offerToken 選択時に使う）
  androidMonthlyBasePlanId: string;
  androidYearlyBasePlanId: string;
  // Web: Stripe の Price ID
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    tier: "start",
    planId: 0,
    name: "Start",
    description: "まず試したい方に",
    features: ["1日10局", "広告なし", "10棋譜までクラウドに保存"],
    androidProductId: "",
    androidMonthlyBasePlanId: "",
    androidYearlyBasePlanId: "",
    stripeMonthlyPriceId: "",
    stripeYearlyPriceId: "",
  },
  {
    tier: "plus",
    planId: 1,
    name: "Plus",
    description: "もっと活用したい方に",
    features: ["対局無制限", "全棋譜をクラウドに保存"],
    androidProductId: "hoshigo_plus",
    androidMonthlyBasePlanId: "monthly-base",
    androidYearlyBasePlanId: "yearly-base",
    stripeMonthlyPriceId: "price_1TERr4HB6HAtRQbPFhUJrMjA",
    stripeYearlyPriceId: "price_1TERr3HB6HAtRQbPdr9olppJ",
    highlighted: true,
  },
  {
    tier: "ultra",
    planId: 2,
    name: "Ultra",
    description: "フル活用したい方に",
    features: ["準備中..."],
    androidProductId: "hoshigo_ultra",
    androidMonthlyBasePlanId: "monthly-base",
    androidYearlyBasePlanId: "yearly-base",
    stripeMonthlyPriceId: "price_1TES2mHB6HAtRQbPUXlbqn6z",
    stripeYearlyPriceId: "price_1TES2lHB6HAtRQbPHqw2palY",
  },
];

// Android の productId → plan_id マップ
export const ANDROID_PRODUCT_TO_PLAN_ID: Record<string, number> =
  Object.fromEntries(
    PLANS.filter((p) => p.androidProductId !== "").map((p) => [
      p.androidProductId,
      p.planId,
    ]),
  );

// Stripe の priceId → plan_id マップ
export const STRIPE_PRICE_TO_PLAN_ID: Record<string, number> =
  Object.fromEntries(
    PLANS.flatMap((p) => [
      [p.stripeMonthlyPriceId, p.planId],
      [p.stripeYearlyPriceId, p.planId],
    ]).filter(([id]) => id !== ""),
  );
