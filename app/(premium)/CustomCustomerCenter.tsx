// src/screens/CustomCustomerCenterScreen.tsx
import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import { useTheme } from "../../src/hooks/useTheme";

interface CustomCustomerCenterScreenProps {
  onDismiss?: () => void;
}

export default function CustomCustomerCenterScreen({
  onDismiss,
}: CustomCustomerCenterScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { customerInfo } = useRevenueCat();
  const { colors } = useTheme();

  const proEntitlement = customerInfo?.entitlements.active["Hoshigo Pro"];
  const expirationDate = proEntitlement?.expirationDate
    ? new Date(proEntitlement.expirationDate)
    : null;
  const willRenew = proEntitlement?.willRenew ?? false;
  const productIdentifier = proEntitlement?.productIdentifier ?? "";

  const getPlanName = (id: string) => {
    if (id.startsWith("premium_monthly")) return t("CustomerCenter.planMonthly");
    if (id.startsWith("premium_yearly"))  return t("CustomerCenter.planYearly");
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
    ).catch(() => Alert.alert(t("CustomerCenter.manageButton"), "Google Playを開けませんでした"));
  };

  // i18n インスタンスから現在の言語を取得して日付フォーマットに使う
  const { i18n } = useTranslation();
  const dateLocale = i18n.language || "ja";

  const BENEFITS = [
    { icon: "♾️", label: t("CustomerCenter.benefitUnlimited") },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* ヘッダー */}
        <TouchableOpacity onPress={onDismiss} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.active }]}>
            {t("CustomerCenter.back")}
          </Text>
        </TouchableOpacity>

        {/* Pro バッジ */}
        <View style={styles.badgeArea}>
          <Text style={styles.badgeEmoji}>✨</Text>
          <Text style={[styles.badgeTitle, { color: colors.text }]}>
            Hoshigo Pro
          </Text>
          <Text style={[styles.badgePlan, { color: colors.subtext }]}>
            {getPlanName(productIdentifier)}
          </Text>
        </View>

        {/* ─── 特典 ─── */}
        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
          {t("CustomerCenter.benefitsSection")}
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.borderColor },
          ]}
        >
          {BENEFITS.map((benefit, index) => (
            <View
              key={benefit.label}
              style={[
                styles.benefitRow,
                index < BENEFITS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderColor,
                },
              ]}
            >
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <Text style={[styles.benefitLabel, { color: colors.text }]}>
                {benefit.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── 次回更新日 ─── */}
        {expirationDate && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
              {willRenew
                ? t("CustomerCenter.renewalDate")
                : t("CustomerCenter.expiryDate")}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.borderColor },
              ]}
            >
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {expirationDate.toLocaleDateString(dateLocale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </>
        )}

        {/* ─── アクション ─── */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.card, borderColor: colors.borderColor },
          ]}
          onPress={openSubscriptionManagement}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>
            {t("CustomerCenter.manageButton")}
          </Text>
          <Text style={[styles.arrow, { color: colors.subtext }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: "600",
  },

  // ─── Pro バッジ ───
  badgeArea: {
    alignItems: "center",
    marginBottom: 40,
  },
  badgeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  badgeTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  badgePlan: {
    fontSize: 16,
  },

  // ─── セクションラベル ───
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },

  // ─── カード（特典・更新日共用） ───
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    overflow: "hidden",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "600",
    padding: 20,
  },

  // ─── 特典行 ───
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  benefitIcon: {
    fontSize: 20,
  },
  benefitLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  // ─── アクション ───
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  arrow: {
    fontSize: 28,
    fontWeight: "300",
  },
});