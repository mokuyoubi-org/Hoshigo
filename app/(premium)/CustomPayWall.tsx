import { StarBackground } from "@/src/components/StarBackGround";
import {
  SubscriptionInfoModal,
  type InfoModalVariant,
} from "@/src/components/SubscriptionInfoModal";
import { useRevenueCat } from "@/src/hooks/useRevenueCat";
import { useTheme } from "@/src/hooks/useTheme";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "@/src/services/RevenueCat";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  StatusBar as RNStatusBar,
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

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";
const GOLD = "#d4af37"; // プレミアム用ゴールド

// ─── 型定義（変更なし） ───────────────────────────────
interface CustomPaywallScreenProps {
  onDismiss?: () => void;
}
type SelectedTier = "starter" | "pro";
type BillingCycle = "monthly" | "yearly";
interface FeatureRow {
  labelKey: string;
  starterKey: string;
  proKey: string;
  highlight?: boolean;
}
interface InfoModalState {
  visible: boolean;
  variant: InfoModalVariant;
  overrideMessage?: string;
  onCloseCallback?: () => void;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    labelKey: "Paywall.GamesPerDay",
    starterKey: "Paywall.GamesLimit",
    proKey: "Paywall.Unlimited",
    highlight: true,
  },
];

const INITIAL_INFO_MODAL: InfoModalState = {
  visible: false,
  variant: "purchaseSuccess",
};

export default function CustomPaywallScreen({
  onDismiss,
}: CustomPaywallScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { refreshStatus } = useRevenueCat();

  // ── ロジック（変更なし） ──
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<SelectedTier>("starter");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [infoModal, setInfoModal] =
    useState<InfoModalState>(INITIAL_INFO_MODAL);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async (): Promise<void> => {
    const offering = await getOfferings();
    setOfferings(offering);
    setLoading(false);
  };

  const showInfoModal = (
    variant: InfoModalVariant,
    options?: { overrideMessage?: string; onCloseCallback?: () => void },
  ): void => {
    setInfoModal({
      visible: true,
      variant,
      overrideMessage: options?.overrideMessage,
      onCloseCallback: options?.onCloseCallback,
    });
  };

  const handleInfoModalClose = (): void => {
    const callback = infoModal.onCloseCallback;
    setInfoModal(INITIAL_INFO_MODAL);
    callback?.();
  };

  const handlePurchase = async (): Promise<void> => {
    if (selectedTier === "starter") {
      onDismiss?.();
      return;
    }
    const pkg = billingCycle === "monthly" ? monthly : yearly;
    if (!pkg) return;
    setPurchasing(true);
    const result = await purchasePackage(pkg);
    setPurchasing(false);
    if (result.success) {
      await refreshStatus();
      showInfoModal("purchaseSuccess", { onCloseCallback: onDismiss });
    } else if (!result.cancelled) {
      showInfoModal("purchaseError", {
        overrideMessage: result.error
          ? `${result.error}\n\n${t("Paywall.ErrorRetry")}`
          : undefined,
      });
    }
  };

  const handleRestore = async (): Promise<void> => {
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);
    if (result.success && result.isPro) {
      await refreshStatus();
      showInfoModal("restoreSuccess", { onCloseCallback: onDismiss });
    } else if (result.success && !result.isPro) {
      showInfoModal("restoreEmpty");
    } else {
      showInfoModal("restoreError", {
        overrideMessage: result.error
          ? `${result.error}\n\n${t("Paywall.ErrorRetry")}`
          : undefined,
      });
    }
  };

  const calculateSavings = (
    monthlyPkg: PurchasesPackage | undefined,
    yearlyPkg: PurchasesPackage | undefined,
  ): number => {
    if (!monthlyPkg || !yearlyPkg) return 0;
    const monthlyTotal = monthlyPkg.product.price * 12;
    const yearlyPrice = yearlyPkg.product.price;
    return Math.floor(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  };

  // ── ローディング ──
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
        <ActivityIndicator size="large" color={STRAWBERRY} />
      </View>
    );
  }

  // ── エラー ──
  if (!offerings) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
        <View style={styles.errorCard}>
          <View style={styles.cardAccentLine} />
          <View style={styles.errorCardInner}>
            <Text style={styles.errorText}>{t("Paywall.LoadError")}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
              <Text style={styles.closeButtonText}>{t("Paywall.Close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const packages = offerings.availablePackages;
  console.log("packages: ", packages);
  const monthly = packages.find((p) =>
    p.product.identifier.startsWith("premium_monthly"),
  );
  const yearly = packages.find((p) =>
    p.product.identifier.startsWith("premium_yearly"),
  );
  const savingsPercent = calculateSavings(monthly, yearly);
  const isProSelected = selectedTier === "pro";

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

      <StarBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeIn }}>
          {/* 戻るボタン */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ {t("Paywall.Back")}</Text>
          </TouchableOpacity>

          {/* ─── タイトルエリア ─── */}
          <View style={styles.titleArea}>
            <Text style={styles.titleBadge}>✨ PREMIUM</Text>
            <Text style={styles.title}>{t("Paywall.Title")}</Text>
            <View style={styles.titleDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDiamond} />
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.subtitle}>{t("Paywall.Subtitle")}</Text>
          </View>

          {/* ─── 比較テーブル ─── */}
          <View style={styles.table}>
            {/* ヘッダー行 */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.featureCol} />

              {/* Starter列 */}
              <TouchableOpacity
                style={[
                  styles.planHeaderCol,
                  !isProSelected && styles.planHeaderColActive,
                ]}
                onPress={() => setSelectedTier("starter")}
                activeOpacity={0.8}
              >
                {!isProSelected && <View style={styles.planHeaderAccent} />}
                <Text
                  style={[
                    styles.planHeaderName,
                    !isProSelected && styles.planHeaderNameActive,
                  ]}
                >
                  {t("Paywall.Starter")}
                </Text>
                <Text
                  style={[
                    styles.planHeaderSub,
                    !isProSelected && styles.planHeaderSubActive,
                  ]}
                >
                  {t("Paywall.Free")}
                </Text>
              </TouchableOpacity>

              {/* Pro列 */}
              <TouchableOpacity
                style={[
                  styles.planHeaderCol,
                  isProSelected && styles.planHeaderColActive,
                ]}
                onPress={() => setSelectedTier("pro")}
                activeOpacity={0.8}
              >
                {isProSelected && <View style={styles.planHeaderAccent} />}
                <Text
                  style={[
                    styles.planHeaderName,
                    isProSelected && styles.planHeaderNameActive,
                  ]}
                >
                  {t("Paywall.Pro")}
                </Text>
                <Text
                  style={[
                    styles.planHeaderSub,
                    isProSelected && styles.planHeaderSubActive,
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            </View>

            {/* データ行 */}
            {FEATURE_ROWS.map((row, index) => (
              <View
                key={row.labelKey}
                style={[
                  styles.tableRow,
                  index < FEATURE_ROWS.length - 1 && styles.tableRowBorder,
                ]}
              >
                <View style={styles.featureCol}>
                  <Text style={styles.featureLabel}>{t(row.labelKey)}</Text>
                </View>
                <View
                  style={[
                    styles.planDataCol,
                    !isProSelected && styles.planDataColActive,
                  ]}
                >
                  <Text style={styles.cellText}>{t(row.starterKey)}</Text>
                </View>
                <View
                  style={[
                    styles.planDataCol,
                    isProSelected && styles.planDataColActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      row.highlight && styles.cellTextHighlight,
                    ]}
                  >
                    {t(row.proKey)}
                  </Text>
                </View>
              </View>
            ))}

            {/* ラジオ行 */}
            <View style={styles.radioRow}>
              <View style={styles.radioSpacer} />
              {(["starter", "pro"] as SelectedTier[]).map((tier) => {
                const active = selectedTier === tier;
                return (
                  <TouchableOpacity
                    key={tier}
                    style={styles.radioCol}
                    onPress={() => setSelectedTier(tier)}
                    disabled={purchasing}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: active ? GOLD : CHOCOLATE_SUB },
                      ]}
                    >
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: active ? GOLD : "transparent" },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── 購入エリア（Pro選択時のみ） ─── */}
          {isProSelected && (
            <View style={styles.purchaseArea}>
              <View
                style={[styles.cardAccentLine, { backgroundColor: GOLD }]}
              />
              <View style={styles.purchaseAreaInner}>
                {/* 年/月トグル */}
                <View style={styles.toggleTrack}>
                  {(["yearly", "monthly"] as BillingCycle[]).map((cycle) => {
                    const active = billingCycle === cycle;
                    return (
                      <TouchableOpacity
                        key={cycle}
                        style={[
                          styles.toggleOption,
                          active && styles.toggleOptionActive,
                        ]}
                        onPress={() => setBillingCycle(cycle)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.toggleLabel,
                            active && styles.toggleLabelActive,
                          ]}
                        >
                          {t(
                            cycle === "yearly"
                              ? "Paywall.Yearly"
                              : "Paywall.Monthly",
                          )}
                        </Text>
                        {cycle === "yearly" && savingsPercent > 0 && (
                          <Text
                            style={[
                              styles.toggleBadge,
                              active && styles.toggleBadgeActive,
                            ]}
                          >
                            {t("Paywall.Off", { percent: savingsPercent })}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 購入ボタン */}
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    purchasing && styles.purchaseButtonDisabled,
                  ]}
                  onPress={handlePurchase}
                  disabled={purchasing}
                  activeOpacity={0.82}
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={styles.purchaseButtonInner}>
                      <Text style={styles.purchaseButtonText}>
                        {billingCycle === "yearly"
                          ? t("Paywall.UpgradeYearly")
                          : t("Paywall.UpgradeMonthly")}
                      </Text>
                      {billingCycle === "yearly" && yearly ? (
                        <Text style={styles.purchaseButtonPrice}>
                          {t("Paywall.PricePerYear", {
                            price: yearly.product.priceString,
                          })}
                        </Text>
                      ) : billingCycle === "monthly" && monthly ? (
                        <Text style={styles.purchaseButtonPrice}>
                          {t("Paywall.PricePerMonth", {
                            price: monthly.product.priceString,
                          })}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 復元・注意文 */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={purchasing}
            activeOpacity={0.6}
          >
            <Text style={styles.restoreButtonText}>{t("Paywall.Restore")}</Text>
          </TouchableOpacity>

          <Text style={styles.noticeText}>{t("Paywall.Notice")}</Text>
        </Animated.View>
      </ScrollView>

      {/* モーダル（変更なし） */}
      <SubscriptionInfoModal
        visible={infoModal.visible}
        variant={infoModal.variant}
        overrideMessage={infoModal.overrideMessage}
        onClose={handleInfoModalClose}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // 背景グリッド（優しい色に）
  bgLineV: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "rgba(200,214,230,0.08)",
  },
  bgLineH: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 1,
    backgroundColor: "rgba(200,214,230,0.08)",
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 56,
  },

  // 戻るボタン
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 28,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },

  // タイトル
  titleArea: {
    alignItems: "center",
    marginBottom: 28,
  },
  titleBadge: {
    fontSize: 11,
    letterSpacing: 4,
    color: GOLD,
    fontWeight: "800",
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  titleDivider: {
    flexDirection: "row",
    alignItems: "center",
    width: 160,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "rgba(212,175,55,0.25)",
  },
  dividerDiamond: {
    width: 5,
    height: 5,
    backgroundColor: GOLD,
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 8,
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 13,
    color: CHOCOLATE_SUB,
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  // テーブル
  table: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(200,214,230,0.2)",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 52,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
  },
  featureCol: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: CHOCOLATE,
  },
  planHeaderCol: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: "rgba(200,214,230,0.2)",
    overflow: "hidden",
    gap: 4,
  },
  planHeaderColActive: {
    backgroundColor: "rgba(212,175,55,0.1)",
  },
  planHeaderAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: GOLD,
    opacity: 0.8,
  },
  planHeaderName: {
    fontSize: 14,
    fontWeight: "700",
    color: CHOCOLATE_SUB,
    textAlign: "center",
  },
  planHeaderNameActive: {
    color: GOLD,
    fontWeight: "800",
  },
  planHeaderSub: {
    fontSize: 11,
    color: CHOCOLATE_SUB,
    fontWeight: "500",
    opacity: 0.6,
  },
  planHeaderSubActive: {
    color: GOLD,
    fontWeight: "700",
    opacity: 1,
  },
  planDataCol: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: "rgba(200,214,230,0.2)",
  },
  planDataColActive: {
    backgroundColor: "rgba(212,175,55,0.05)",
  },
  cellText: {
    fontSize: 13,
    textAlign: "center",
    color: CHOCOLATE_SUB,
    fontWeight: "600",
  },
  cellTextHighlight: {
    fontWeight: "800",
    color: GOLD,
  },

  // ラジオ
  radioRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: "rgba(200,214,230,0.2)",
    paddingVertical: 12,
  },
  radioSpacer: { flex: 1 },
  radioCol: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // 購入エリア
  purchaseArea: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: `${GOLD}50`,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: GOLD,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardAccentLine: {
    height: 2.5,
    opacity: 0.7,
  },
  purchaseAreaInner: {
    padding: 14,
    gap: 12,
  },
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(200,214,230,0.1)",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    gap: 2,
  },
  toggleOptionActive: {
    backgroundColor: GOLD,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: CHOCOLATE_SUB,
  },
  toggleLabelActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  toggleBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: GOLD,
  },
  toggleBadgeActive: {
    color: "#ffffff",
  },
  purchaseButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonInner: {
    alignItems: "center",
    gap: 4,
  },
  purchaseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  purchaseButtonPrice: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },

  // 復元・注意
  restoreButton: {
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  restoreButtonText: {
    fontSize: 13,
    color: CHOCOLATE_SUB,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    color: CHOCOLATE_SUB,
    opacity: 0.5,
  },

  // エラーカード
  errorCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  errorCardInner: {
    padding: 24,
    alignItems: "center",
    gap: 20,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    color: CHOCOLATE,
    lineHeight: 22,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    backgroundColor: "rgba(200,214,230,0.1)",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
  },
});
