// ============================================================
// screens/SubscriptionScreen.tsx
// Android / iOS 用サブスクリプション画面
// ============================================================

import { BACKGROUND, STRAWBERRY } from "@/src/constants/colors";
import { PLANS } from "@/src/constants/plans";
import { IAPContext } from "@/src/contexts/IAPContext";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SubscriptionScreen() {
  const {
    priceMap,
    loading,
    purchasing,
    activePlanId,
    error,
    billingCycle,
    switchCycle,
    subscribe,
  } = useContext(IAPContext);
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ─── ヘッダー ─── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹ {t("common.back")}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heading}>プランを選択</Text>
          <Text style={styles.sub}>いつでもキャンセル可能です</Text>

          {/* 月払い / 年払い トグル */}
          <View style={styles.toggle}>
            {(["monthly", "yearly"] as const).map((cycle) => (
              <TouchableOpacity
                key={cycle}
                style={[
                  styles.toggleBtn,
                  billingCycle === cycle && styles.toggleBtnActive,
                ]}
                onPress={() => switchCycle(cycle)}
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

          {error && <Text style={styles.error}>{error}</Text>}

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#111"
              style={{ marginTop: 40 }}
            />
          ) : (
            PLANS.map((plan) => {
              const isFree = plan.tier === "start";

              // priceMap のキーは "productId:basePlanId" 形式
              const basePlanId =
                billingCycle === "monthly"
                  ? plan.androidMonthlyBasePlanId
                  : plan.androidYearlyBasePlanId;
              const priceKey = `${plan.androidProductId}:${basePlanId}`;
              const price = isFree ? "無料" : (priceMap[priceKey] ?? "---");

              const isActive =
                !isFree && activePlanId === plan.androidProductId;
              const isBuying = !isFree && purchasing === plan.androidProductId;

              return (
                <View
                  key={plan.tier}
                  style={[
                    styles.card,
                    plan.highlighted && styles.cardHighlighted,
                    isActive && styles.cardActive,
                  ]}
                >
                  {plan.highlighted && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>おすすめ</Text>
                    </View>
                  )}

                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>

                  <View style={styles.features}>
                    {plan.features.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <Text style={styles.check}>✓</Text>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.price}>
                    {price}
                    {!isFree && (
                      <Text style={styles.priceUnit}>
                        {billingCycle === "monthly" ? " / 月" : " / 年"}
                      </Text>
                    )}
                  </Text>

                  {isFree ? (
                    <View style={styles.freeLabel}>
                      <Text style={styles.freeLabelText}>無料プラン</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, isActive && styles.buttonActive]}
                      onPress={() => subscribe(plan.androidProductId)}
                      disabled={!!purchasing || isActive}
                      activeOpacity={0.8}
                    >
                      {isBuying ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>
                          {isActive ? "購読中 ✓" : `${plan.name}を始める`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          <Text style={styles.note}>
            ご購入はGoogleアカウントに請求されます。{"\n"}
            サブスクリプションは次の請求日の24時間前までにキャンセルしない限り自動更新されます。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ACCENT = "#111";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 8,
  },

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
  heading: { fontSize: 26, fontWeight: "700", color: ACCENT, marginTop: 16 },

  sub: { fontSize: 14, color: "#888", marginTop: 4, marginBottom: 20 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: { fontSize: 14, color: "#888", fontWeight: "500" },
  toggleTextActive: { color: ACCENT, fontWeight: "700" },
  saveBadge: {
    fontSize: 10,
    color: "#2e7d32",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  error: { color: "red", fontSize: 13, marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  cardHighlighted: { borderColor: ACCENT, borderWidth: 2 },
  cardActive: { backgroundColor: "#f9f9f9" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  planName: { fontSize: 20, fontWeight: "700", color: ACCENT },
  planDesc: { fontSize: 13, color: "#888", marginTop: 2, marginBottom: 12 },
  features: { gap: 6, marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: { color: "#2e7d32", fontWeight: "700", fontSize: 14 },
  featureText: { fontSize: 13, color: "#444" },
  price: { fontSize: 22, fontWeight: "800", color: ACCENT, marginBottom: 14 },
  priceUnit: { fontSize: 14, fontWeight: "400", color: "#888" },
  button: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonActive: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  freeLabel: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  freeLabelText: { fontSize: 14, color: "#888", fontWeight: "600" },
  note: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
  },
});
