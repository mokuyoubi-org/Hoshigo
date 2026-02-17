// src/screens/CustomPaywallScreen.tsx
import { useRevenueCat } from "@/src/hooks/useRevenueCat";
import { useTheme } from "@/src/hooks/useTheme";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "@/src/services/RevenueCat";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type {
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";

interface CustomPaywallScreenProps {
  onDismiss?: () => void;
}

type PlanType = "monthly" | "yearly" | null;

export default function CustomPaywallScreen({
  onDismiss,
}: CustomPaywallScreenProps): React.JSX.Element {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly"); // デフォルトで年額を選択
  const { refreshStatus } = useRevenueCat();
  const { colors } = useTheme();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async (): Promise<void> => {
    console.log("🔍 Loading offerings...");
    const offering = await getOfferings();

    if (!offering) {
      console.log("❌ Offering is null!");
      setOfferings(null);
      setLoading(false);
      return;
    }

    console.log("✅ Offering exists");
    console.log(
      "📦 Available packages count:",
      offering.availablePackages?.length,
    );

    if (offering.availablePackages) {
      offering.availablePackages.forEach((pkg, index) => {
        console.log(`📦 Package ${index}:`, {
          identifier: pkg.identifier,
          productIdentifier: pkg.product?.identifier,
          priceString: pkg.product?.priceString,
          title: pkg.product?.title,
        });
      });
    }

    setOfferings(offering);
    setLoading(false);
  };

  const handlePurchase = async (): Promise<void> => {
    if (!selectedPlan) {
      Alert.alert(
        "プランを選択してください",
        "月額または年額プランを選択してください",
      );
      return;
    }

    const pkg = selectedPlan === "monthly" ? monthly : yearly;
    if (!pkg) return;

    setPurchasing(true);
    console.log("💰 Purchasing product:", pkg.product.identifier);

    const result = await purchasePackage(pkg);
    setPurchasing(false);

    if (result.success) {
      await refreshStatus();
      Alert.alert("成功！", "Hoshigo Proへようこそ！");
      onDismiss?.();
    } else if (result.cancelled) {
      // キャンセルされた - 何もしない
    } else {
      Alert.alert("エラー", result.error || "購入に失敗しました");
    }
  };

  const handleRestore = async (): Promise<void> => {
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);

    if (result.success && result.isPro) {
      await refreshStatus();
      Alert.alert("復元成功！", "サブスクリプションが復元されました");
      onDismiss?.();
    } else if (result.success && !result.isPro) {
      Alert.alert("情報", "復元できるサブスクリプションがありませんでした");
    } else {
      Alert.alert("エラー", result.error || "復元に失敗しました");
    }
  };

  // 割引率を計算（小数点切り捨て）
  const calculateSavings = (
    monthlyPkg: PurchasesPackage | undefined,
    yearlyPkg: PurchasesPackage | undefined,
  ): number => {
    if (!monthlyPkg || !yearlyPkg) return 0;

    const monthlyPrice = monthlyPkg.product.price;
    const yearlyPrice = yearlyPkg.product.price;

    // 月額 × 12 と年額の差額
    const monthlyTotal = monthlyPrice * 12;
    const savings = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;

    // 小数点切り捨て
    return Math.floor(savings);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.active} />
      </View>
    );
  }

  if (!offerings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          商品情報を読み込めませんでした
        </Text>
        <TouchableOpacity
          style={[
            styles.closeButtonCard,
            { backgroundColor: colors.card, borderColor: colors.borderColor },
          ]}
          onPress={onDismiss}
        >
          <Text style={[styles.closeButtonText, { color: colors.text }]}>
            閉じる
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // パッケージ取得
  const packages = offerings.availablePackages;
  const monthly = packages.find((p) =>
    p.product.identifier.startsWith("premium_monthly"),
  );
  const yearly = packages.find((p) =>
    p.product.identifier.startsWith("premium_yearly"),
  );

  const savingsPercent = calculateSavings(monthly, yearly);

  console.log("📦 Found:", {
    monthly: !!monthly,
    yearly: !!yearly,
    savingsPercent,
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Text style={[styles.backButtonText, { color: colors.active }]}>
              ‹ 戻る
            </Text>
          </TouchableOpacity>
        </View>

        {/* タイトル */}
        <Text style={[styles.title, { color: colors.text }]}>Hoshigo Pro</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          すべての機能をアンロック
        </Text>

        {/* プラン選択 */}
        <View style={styles.plansContainer}>
          {/* 月額プラン */}
          {monthly && (
            <TouchableOpacity
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor:
                    selectedPlan === "monthly"
                      ? colors.active
                      : colors.borderColor,
                },
                selectedPlan === "monthly" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("monthly")}
              disabled={purchasing}
            >
              <View style={styles.planHeader}>
                <View style={styles.radioOuter}>
                  {selectedPlan === "monthly" && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.active },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  月額プラン
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.active }]}>
                {monthly.product.priceString}/月
              </Text>
            </TouchableOpacity>
          )}

          {/* 年額プラン */}
          {yearly && (
            <TouchableOpacity
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor:
                    selectedPlan === "yearly"
                      ? colors.active
                      : colors.borderColor,
                },
                selectedPlan === "yearly" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("yearly")}
              disabled={purchasing}
            >
              {savingsPercent > 0 && (
                <View
                  style={[styles.badge, { backgroundColor: colors.active }]}
                >
                  <Text style={styles.badgeText}>{savingsPercent}%お得</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={styles.radioOuter}>
                  {selectedPlan === "yearly" && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.active },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  年額プラン
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.active }]}>
                {yearly.product.priceString}/年
              </Text>
              {savingsPercent > 0 && (
                <Text style={[styles.savingsText, { color: colors.subtext }]}>
                  月額より約{savingsPercent}%お得
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 購入ボタン */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            { backgroundColor: colors.active },
            purchasing && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPlan}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {selectedPlan === "monthly"
                ? "月額プランを購入"
                : "年額プランを購入"}
            </Text>
          )}
        </TouchableOpacity>

        {/* 購入を復元 */}
        <TouchableOpacity
          style={[
            styles.restoreButton,
            { backgroundColor: colors.card, borderColor: colors.borderColor },
          ]}
          onPress={handleRestore}
          disabled={purchasing}
        >
          <Text style={[styles.restoreButtonText, { color: colors.text }]}>
            購入を復元
          </Text>
        </TouchableOpacity>

        {/* 注意事項 */}
        <Text style={[styles.noticeText, { color: colors.subtext }]}>
          • 購入後、即座にすべての機能が利用可能になります{"\n"}•
          サブスクリプションは自動更新されます{"\n"}• いつでもGoogle
          Playから解約できます
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  plansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    position: "relative",
  },
  planCardSelected: {
    borderWidth: 3,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    position: "absolute",
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  purchaseButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  restoreButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  closeButtonCard: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});
