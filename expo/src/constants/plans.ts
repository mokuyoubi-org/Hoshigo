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
    description: "囲碁を始めるあなたに",
    features: [
      "1日10局",
      "10棋譜までクラウドに保存",
      "10局まで観戦可能",
      "広告なし",
    ],
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
    description: "囲碁をもっと楽しみたいあなたに",
    features: [
      "対局無制限",
      "全棋譜をクラウドに保存",
      "全対局を観戦可能",
      "広告なし",
    ],
    androidProductId: process.env.EXPO_PUBLIC_HOSHIGO_PLUS_ANDROID_PRODUCT_ID!,
    androidMonthlyBasePlanId:
      process.env.EXPO_PUBLIC_HOSHIGO_PLUS_ANDROID_MONTHLY_BASE_PLAN_ID!,
    androidYearlyBasePlanId:
      process.env.EXPO_PUBLIC_HOSHIGO_PLUS_ANDROID_YEARLY_BASE_PLAN_ID!,
    stripeMonthlyPriceId:
      process.env.EXPO_PUBLIC_HOSHIGO_PLUS_STRIPE_MONTHLY_PRICE_ID!,
    stripeYearlyPriceId:
      process.env.EXPO_PUBLIC_HOSHIGO_PLUS_STRIPE_YEARLY_PRICE_ID!,
    highlighted: true,
  },
  // {
  //   tier: "ultra",
  //   planId: 2,
  //   name: "Ultra",
  //   description: "フル活用したい方に",
  //   features: ["準備中..."],
  //   androidProductId: process.env.EXPO_PUBLIC_HOSHIGO_ULTRA_ANDROID_PRODUCT_ID!,
  //   androidMonthlyBasePlanId: process.env.EXPO_PUBLIC_HOSHIGO_ULTRA_ANDROID_MONTHLY_BASE_PLAN_ID!,
  //   androidYearlyBasePlanId: process.env.EXPO_PUBLIC_HOSHIGO_ULTRA_ANDROID_YEARLY_BASE_PLAN_ID!,
  //   stripeMonthlyPriceId: process.env.EXPO_PUBLIC_HOSHIGO_ULTRA_STRIPE_MONTHLY_PRICE_ID!,
  //   stripeYearlyPriceId: process.env.EXPO_PUBLIC_HOSHIGO_ULTRA_STRIPE_YEARLY_PRICE_ID!,
  // },
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
