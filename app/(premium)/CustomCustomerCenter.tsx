// src/screens/CustomCustomerCenterScreen.tsx
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Linking,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import { useTheme } from "../../src/hooks/useTheme";
import { StarBackground } from "@/src/components/StarBackGround";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";
const GOLD = "#d4af37"; // プレミアム用

interface CustomCustomerCenterScreenProps {
  onDismiss?: () => void;
}

export default function CustomCustomerCenterScreen({
  onDismiss,
}: CustomCustomerCenterScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { customerInfo } = useRevenueCat();
  const { colors } = useTheme();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const proEntitlement = customerInfo?.entitlements.active["Hoshigo Pro"];
  const expirationDate = proEntitlement?.expirationDate
    ? new Date(proEntitlement.expirationDate)
    : null;
  const willRenew = proEntitlement?.willRenew ?? false;
  const productIdentifier = proEntitlement?.productIdentifier ?? "";

  const getPlanName = (id: string) => {
    if (id.startsWith("premium_monthly"))
      return t("CustomerCenter.planMonthly");
    if (id.startsWith("premium_yearly")) return t("CustomerCenter.planYearly");
    return t("CustomerCenter.plan");
  };

  // 日付ロケールを i18n の現在言語に合わせる
  const getDateLocale = () => {
    const lang = t("CustomerCenter.back") === "‹ Back" ? "en" : undefined;
    // i18n.language を直接参照する方が確実
    return undefined; // useTranslation の i18n インスタンスを使う場合は下記参照
  };

  const openSubscriptionManagement = () => {
    Linking.openURL(
      "https://play.google.com/store/account/subscriptions",
    ).catch(() =>
      Alert.alert(
        t("CustomerCenter.manageButton"),
        "Google Playを開けませんでした",
      ),
    );
  };

  // i18n インスタンスから現在の言語を取得して日付フォーマットに使う
  const { i18n } = useTranslation();
  const dateLocale = i18n.language || "ja";

  const BENEFITS = [
    { icon: "♾️", label: t("CustomerCenter.benefitUnlimited") },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

          <StarBackground />   
   

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fadeIn }}>
          {/* ヘッダー */}
          <TouchableOpacity onPress={onDismiss} style={styles.backButton}>
            <Text style={styles.backButtonText}>
              {t("CustomerCenter.back")}
            </Text>
          </TouchableOpacity>

          {/* Pro バッジ */}
          <View style={styles.badgeArea}>
            <View style={styles.badgeRing}>
              <Text style={styles.badgeEmoji}>✨</Text>
            </View>
            <Text style={styles.badgeTitle}>Hoshigo Pro</Text>
            <Text style={styles.badgePlan}>
              {getPlanName(productIdentifier)}
            </Text>
          </View>

          {/* ─── 特典 ─── */}
          <Text style={styles.sectionLabel}>
            {t("CustomerCenter.benefitsSection")}
          </Text>
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            {BENEFITS.map((benefit, index) => (
              <View
                key={benefit.label}
                style={[
                  styles.benefitRow,
                  index < BENEFITS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(200,214,230,0.15)",
                  },
                ]}
              >
                <View style={styles.benefitIconWrapper}>
                  <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                </View>
                <Text style={styles.benefitLabel}>{benefit.label}</Text>
              </View>
            ))}
          </View>

          {/* ─── 次回更新日 ─── */}
          {expirationDate && (
            <>
              <Text style={styles.sectionLabel}>
                {willRenew
                  ? t("CustomerCenter.renewalDate")
                  : t("CustomerCenter.expiryDate")}
              </Text>
              <View style={styles.card}>
                <View style={styles.cardAccent} />
                <View style={styles.dateWrapper}>
                  <Text style={styles.cardValue}>
                    {expirationDate.toLocaleDateString(dateLocale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* ─── アクション ─── */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={openSubscriptionManagement}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>
              {t("CustomerCenter.manageButton")}
            </Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
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

  content: {
    padding: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 40,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },

  // ─── Pro バッジ ───
  badgeArea: {
    alignItems: "center",
    marginBottom: 40,
  },
  badgeRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${GOLD}15`,
    borderWidth: 2,
    borderColor: `${GOLD}40`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  badgeEmoji: {
    fontSize: 48,
  },
  badgeTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
    color: CHOCOLATE,
  },
  badgePlan: {
    fontSize: 16,
    color: GOLD,
    fontWeight: "700",
  },

  // ─── セクションラベル ───
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
    color: CHOCOLATE_SUB,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ─── カード（特典・更新日共用） ───
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    marginBottom: 28,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardAccent: {
    height: 2.5,
    backgroundColor: GOLD,
    opacity: 0.6,
  },
  dateWrapper: {
    padding: 20,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },

  // ─── 特典行 ───
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  benefitIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${GOLD}15`,
    borderWidth: 1.5,
    borderColor: `${GOLD}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitIcon: {
    fontSize: 20,
  },
  benefitLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },

  // ─── アクション ───
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    backgroundColor: "#ffffff",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  arrow: {
    fontSize: 28,
    fontWeight: "300",
    color: CHOCOLATE_SUB,
    opacity: 0.5,
  },
});
