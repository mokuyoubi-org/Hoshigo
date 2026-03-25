// ============================================================
// screens/SubscriptionWebScreen.tsx
// Web 用サブスクリプション画面
// 価格は起動時に get-stripe-prices Edge Function から取得します
// ============================================================

import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { STRAWBERRY } from "@/src/constants/colors";
import { PLANS } from "@/src/constants/plans";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { UidContext } from "@/src/contexts/UserContexts";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

type BillingCycle = "monthly" | "yearly";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const HOSHIGO_APP_URL = process.env.EXPO_PUBLIC_HOSHIGO_APP_URL;

const GET_PRICES_URL = `${SUPABASE_URL}/functions/v1/get-stripe-prices`;
const CREATE_STRIPE_URL = `${SUPABASE_URL}/functions/v1/create-stripe-url`;

type StripePriceInfo = {
  priceId: string;
  productId: string;
  amount: number;
  currency: string;
  interval: "month" | "year" | null;
  intervalCount: number;
  formatted: string;
};

export default function SubscriptionScreen() {
  const uid = useContext(UidContext);
  const { t } = useTranslation();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [priceMap, setPriceMap] = useState<Record<string, StripePriceInfo>>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const res = await fetch(GET_PRICES_URL);
      if (!res.ok) throw new Error("価格情報の取得に失敗しました");
      const { prices }: { prices: StripePriceInfo[] } = await res.json();
      const map: Record<string, StripePriceInfo> = {};
      prices.forEach((p) => {
        map[p.priceId] = p;
      });
      setPriceMap(map);
    } catch (e: any) {
      setPricesError(e.message ?? "価格情報の取得に失敗しました");
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handleSubscribe = async (priceId: string) => {
    try {
      setPurchasing(priceId);
      setPurchaseError(null);
      const res = await fetch(CREATE_STRIPE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: `${HOSHIGO_APP_URL}/success`,
          cancelUrl: `${HOSHIGO_APP_URL}/cancel`,
          uid,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "決済URLの取得に失敗しました");
      }
      const { url } = await res.json();
      await Linking.openURL(url);
    } catch (e: any) {
      setPurchaseError(e.message ?? "予期せぬエラーが発生しました");
    } finally {
      setPurchasing(null);
    }
  };

  // 取得した価格を返す。まだ取得中・失敗時は null
  const getDisplayPrice = (plan: (typeof PLANS)[number]): string | null => {
    if (plan.tier === "start") return "無料";
    const priceId =
      billingCycle === "monthly"
        ? plan.stripeMonthlyPriceId
        : plan.stripeYearlyPriceId;
    return priceMap[priceId]?.formatted ?? null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ─── ヘッダー ─── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/Settings")}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>プランを選択</Text>
        <Text style={styles.sub}>
          すべてのプランは30日間の無料トライアル付き
        </Text>

        {/* 月払い / 年払い トグル */}
        <View style={styles.toggle}>
          {(["monthly", "yearly"] as const).map((cycle) => (
            <TouchableOpacity
              key={cycle}
              style={[
                styles.toggleBtn,
                billingCycle === cycle && styles.toggleBtnActive,
              ]}
              onPress={() => setBillingCycle(cycle)}
            >
              <Text
                style={[
                  styles.toggleText,
                  billingCycle === cycle && styles.toggleTextActive,
                ]}
              >
                {cycle === "monthly" ? "月払い" : "年払い"}
              </Text>
              {cycle === "yearly" && (
                <Text style={styles.saveBadge}>2ヶ月分お得</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {pricesError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {pricesError}</Text>
            <TouchableOpacity onPress={fetchPrices}>
              <Text style={styles.retryText}>再試行する</Text>
            </TouchableOpacity>
          </View>
        )}
        {purchaseError && (
          <Text style={styles.errorText}>⚠ {purchaseError}</Text>
        )}

        <View style={styles.grid}>
          {PLANS.map((plan) => {
            const isFree = plan.tier === "start";
            const priceId =
              billingCycle === "monthly"
                ? plan.stripeMonthlyPriceId
                : plan.stripeYearlyPriceId;
            const isBuying = purchasing === priceId;
            const displayPrice = getDisplayPrice(plan);

            return (
              <View
                key={plan.tier}
                style={[
                  styles.card,
                  plan.highlighted && styles.cardHighlighted,
                ]}
              >
                {plan.highlighted && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>おすすめ</Text>
                  </View>
                )}

                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDesc}>{plan.description}</Text>

                {/* 価格：取得中はスピナー、取得後は価格を表示 */}
                {pricesLoading && !isFree ? (
                  <ActivityIndicator
                    size="small"
                    color="#aaa"
                    style={styles.priceLoader}
                  />
                ) : (
                  <Text style={styles.price}>
                    {displayPrice}
                    {!isFree && (
                      <Text style={styles.priceUnit}>
                        {billingCycle === "monthly" ? " / 月" : " / 年"}
                      </Text>
                    )}
                  </Text>
                )}

                <View style={styles.divider} />

                <View style={styles.features}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Text style={styles.check}>✓</Text>
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {isFree ? (
                  <View style={styles.freeLabel}>
                    <Text style={styles.freeLabelText}>無料プラン</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      plan.highlighted && styles.buttonHighlighted,
                      (pricesLoading || !!purchasing) && styles.buttonDisabled,
                    ]}
                    onPress={() => handleSubscribe(priceId)}
                    disabled={pricesLoading || !!purchasing}
                    activeOpacity={0.8}
                  >
                    {isBuying ? (
                      <ActivityIndicator
                        size="small"
                        color={plan.highlighted ? "#fff" : "#111"}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          plan.highlighted && styles.buttonTextHighlighted,
                        ]}
                      >
                        {plan.name}を始める →
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {!isFree && (
                  <Text style={styles.trialNote}>30日間無料トライアル</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.stripeBadge}>
          🔒 決済は Stripe によって安全に処理されます
        </Text>
        <Text style={styles.terms}>
          ご購入により、利用規約およびプライバシーポリシーに同意したものとみなされます。
          {"\n"}
          サブスクリプションは次の請求日の24時間前までにキャンセルしない限り自動更新されます。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const ACCENT = "#111";
const HIGHLIGHT = "#2563eb";

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },
  safe: { flex: 1, backgroundColor: "#fafafa" },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    paddingTop: 16,
    alignItems: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT,
    marginTop: 40,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    color: "#888",
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#efefef",
    borderRadius: 10,
    padding: 4,
    marginBottom: 32,
    alignSelf: "center",
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: { fontSize: 14, color: "#888", fontWeight: "500" },
  toggleTextActive: { color: ACCENT, fontWeight: "700" },
  saveBadge: {
    fontSize: 10,
    color: "#15803d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
  },
  errorBox: { alignItems: "center", marginBottom: 16, gap: 4 },
  errorText: { color: "#dc2626", fontSize: 13 },
  retryText: {
    color: HIGHLIGHT,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  grid: { width: "100%", gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 24,
    width: "100%",
  },
  cardHighlighted: {
    borderColor: HIGHLIGHT,
    borderWidth: 2,
    shadowColor: HIGHLIGHT,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: HIGHLIGHT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  planName: { fontSize: 22, fontWeight: "800", color: ACCENT },
  planDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  priceLoader: { marginVertical: 18 },
  price: { fontSize: 32, fontWeight: "800", color: ACCENT, marginTop: 16 },
  priceUnit: { fontSize: 14, fontWeight: "400", color: "#9ca3af" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 16 },
  features: { gap: 8, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: { color: "#16a34a", fontWeight: "700", fontSize: 14 },
  featureText: { fontSize: 14, color: "#374151" },
  button: {
    borderWidth: 2,
    borderColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonHighlighted: { backgroundColor: HIGHLIGHT, borderColor: HIGHLIGHT },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: ACCENT, fontSize: 15, fontWeight: "700" },
  buttonTextHighlighted: { color: "#fff" },
  freeLabel: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  freeLabelText: { fontSize: 14, color: "#888", fontWeight: "600" },
  trialNote: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 10,
  },
  stripeBadge: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 32,
    textAlign: "center",
  },
  terms: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
});
