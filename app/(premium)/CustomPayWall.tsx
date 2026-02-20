// import {
//   SubscriptionInfoModal,
//   type InfoModalVariant,
// } from "@/src/components/SubscriptionInfoModal";
// import { useRevenueCat } from "@/src/hooks/useRevenueCat";
// import { useTheme } from "@/src/hooks/useTheme";
// import {
//   getOfferings,
//   purchasePackage,
//   restorePurchases,
// } from "@/src/services/RevenueCat";
// import React, { useEffect, useState } from "react";
// import { useTranslation } from "react-i18next"; // 追加
// import {
//   ActivityIndicator,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import type {
//   PurchasesOffering,
//   PurchasesPackage,
// } from "react-native-purchases";
// import { SafeAreaView } from "react-native-safe-area-context";

// interface CustomPaywallScreenProps {
//   onDismiss?: () => void;
// }

// type SelectedTier = "starter" | "pro";
// type BillingCycle = "monthly" | "yearly";

// interface FeatureRow {
//   labelKey: string; // 翻訳キーに変更
//   starterKey: string; // 翻訳キーに変更
//   proKey: string; // 翻訳キーに変更
//   highlight?: boolean;
// }

// const FEATURE_ROWS: FeatureRow[] = [
//   {
//     labelKey: "Paywall.GamesPerDay",
//     starterKey: "Paywall.GamesLimit",
//     proKey: "Paywall.Unlimited",
//     highlight: true,
//   },
// ];

// interface InfoModalState {
//   visible: boolean;
//   variant: InfoModalVariant;
//   overrideMessage?: string;
//   onCloseCallback?: () => void;
// }

// const INITIAL_INFO_MODAL: InfoModalState = {
//   visible: false,
//   variant: "purchaseSuccess",
// };

// export default function CustomPaywallScreen({
//   onDismiss,
// }: CustomPaywallScreenProps): React.JSX.Element {
//   const { t } = useTranslation(); // 追加
//   const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [purchasing, setPurchasing] = useState<boolean>(false);

//   const [selectedTier, setSelectedTier] = useState<SelectedTier>("starter");
//   const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

//   const [infoModal, setInfoModal] =
//     useState<InfoModalState>(INITIAL_INFO_MODAL);

//   const { refreshStatus } = useRevenueCat();
//   const { colors } = useTheme();

//   useEffect(() => {
//     loadOfferings();
//   }, []);

//   const loadOfferings = async (): Promise<void> => {
//     const offering = await getOfferings();
//     setOfferings(offering);
//     setLoading(false);
//   };

//   const showInfoModal = (
//     variant: InfoModalVariant,
//     options?: { overrideMessage?: string; onCloseCallback?: () => void },
//   ): void => {
//     setInfoModal({
//       visible: true,
//       variant,
//       overrideMessage: options?.overrideMessage,
//       onCloseCallback: options?.onCloseCallback,
//     });
//   };

//   const handleInfoModalClose = (): void => {
//     const callback = infoModal.onCloseCallback;
//     setInfoModal(INITIAL_INFO_MODAL);
//     callback?.();
//   };

//   const handlePurchase = async (): Promise<void> => {
//     if (selectedTier === "starter") {
//       onDismiss?.();
//       return;
//     }

//     const pkg = billingCycle === "monthly" ? monthly : yearly;
//     if (!pkg) return;

//     setPurchasing(true);
//     const result = await purchasePackage(pkg);
//     setPurchasing(false);

//     if (result.success) {
//       await refreshStatus();
//       showInfoModal("purchaseSuccess", { onCloseCallback: onDismiss });
//     } else if (!result.cancelled) {
//       showInfoModal("purchaseError", {
//         overrideMessage: result.error
//           ? `${result.error}\n\n${t("Paywall.ErrorRetry")}`
//           : undefined,
//       });
//     }
//   };

//   const handleRestore = async (): Promise<void> => {
//     setPurchasing(true);
//     const result = await restorePurchases();
//     setPurchasing(false);

//     if (result.success && result.isPro) {
//       await refreshStatus();
//       showInfoModal("restoreSuccess", { onCloseCallback: onDismiss });
//     } else if (result.success && !result.isPro) {
//       showInfoModal("restoreEmpty");
//     } else {
//       showInfoModal("restoreError", {
//         overrideMessage: result.error
//           ? `${result.error}\n\n${t("Paywall.ErrorRetry")}`
//           : undefined,
//       });
//     }
//   };

//   const calculateSavings = (
//     monthlyPkg: PurchasesPackage | undefined,
//     yearlyPkg: PurchasesPackage | undefined,
//   ): number => {
//     if (!monthlyPkg || !yearlyPkg) return 0;
//     const monthlyTotal = monthlyPkg.product.price * 12;
//     const yearlyPrice = yearlyPkg.product.price;
//     return Math.floor(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
//   };

//   if (loading) {
//     return (
//       <View style={[styles.container, { backgroundColor: colors.background }]}>
//         <ActivityIndicator size="large" color={colors.active} />
//       </View>
//     );
//   }

//   if (!offerings) {
//     return (
//       <View style={[styles.container, { backgroundColor: colors.background }]}>
//         <Text style={[styles.errorText, { color: colors.text }]}>
//           {t("Paywall.LoadError")}
//         </Text>
//         <TouchableOpacity
//           style={[
//             styles.closeButtonCard,
//             { backgroundColor: colors.card, borderColor: colors.borderColor },
//           ]}
//           onPress={onDismiss}
//         >
//           <Text style={[styles.closeButtonText, { color: colors.text }]}>
//             {t("Paywall.Close")}
//           </Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const packages = offerings.availablePackages;
//   const monthly = packages.find((p) =>
//     p.product.identifier.startsWith("premium_monthly"),
//   );
//   const yearly = packages.find((p) =>
//     p.product.identifier.startsWith("premium_yearly"),
//   );

//   const savingsPercent = calculateSavings(monthly, yearly);
//   const isProSelected = selectedTier === "pro";

//   return (
//     <SafeAreaView
//       style={[styles.container, { backgroundColor: colors.background }]}
//     >
//       <ScrollView
//         style={[styles.container, { backgroundColor: colors.background }]}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={styles.header}>
//           <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
//             <Text style={[styles.backButtonText, { color: colors.active }]}>
//               ‹ {t("Paywall.Back")}
//             </Text>
//           </TouchableOpacity>
//         </View>

//         <Text style={[styles.title, { color: colors.text }]}>
//           {t("Paywall.Title")}
//         </Text>
//         <Text style={[styles.subtitle, { color: colors.subtext }]}>
//           {t("Paywall.Subtitle")}
//         </Text>

//         <View style={[styles.table, { borderColor: colors.borderColor }]}>
//           <View
//             style={[
//               styles.tableHeaderRow,
//               { borderBottomColor: colors.borderColor },
//             ]}
//           >
//             <View style={styles.featureCol} />

//             <View
//               style={[
//                 styles.planHeaderCol,
//                 {
//                   borderLeftColor: colors.borderColor,
//                   backgroundColor: !isProSelected ? colors.active : colors.card,
//                 },
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.planHeaderName,
//                   { color: !isProSelected ? "#fff" : colors.text },
//                 ]}
//               >
//                 {t("Paywall.Starter")}
//               </Text>
//               <Text
//                 style={[
//                   styles.planHeaderPrice,
//                   {
//                     color: !isProSelected
//                       ? "rgba(255,255,255,0.8)"
//                       : colors.subtext,
//                   },
//                 ]}
//               >
//                 {t("Paywall.Free")}
//               </Text>
//             </View>

//             <View
//               style={[
//                 styles.planHeaderCol,
//                 {
//                   borderLeftColor: colors.borderColor,
//                   backgroundColor: isProSelected ? colors.active : colors.card,
//                 },
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.planHeaderName,
//                   { color: isProSelected ? "#fff" : colors.text },
//                 ]}
//               >
//                 {t("Paywall.Pro")}
//               </Text>
//             </View>
//           </View>

//           {FEATURE_ROWS.map((row, index) => (
//             <View
//               key={row.labelKey}
//               style={[
//                 styles.tableRow,
//                 index < FEATURE_ROWS.length - 1 && {
//                   borderBottomWidth: StyleSheet.hairlineWidth,
//                   borderBottomColor: colors.borderColor,
//                 },
//               ]}
//             >
//               <View style={styles.featureCol}>
//                 <Text style={[styles.featureLabel, { color: colors.text }]}>
//                   {t(row.labelKey)}
//                 </Text>
//               </View>

//               <View
//                 style={[
//                   styles.planDataCol,
//                   {
//                     borderLeftColor: colors.borderColor,
//                     backgroundColor: !isProSelected
//                       ? colors.active + "12"
//                       : "transparent",
//                   },
//                 ]}
//               >
//                 <Text style={[styles.cellText, { color: colors.subtext }]}>
//                   {t(row.starterKey)}
//                 </Text>
//               </View>

//               <View
//                 style={[
//                   styles.planDataCol,
//                   {
//                     borderLeftColor: colors.borderColor,
//                     backgroundColor: isProSelected
//                       ? colors.active + "12"
//                       : "transparent",
//                   },
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.cellText,
//                     row.highlight && styles.cellTextHighlight,
//                     { color: row.highlight ? colors.active : colors.text },
//                   ]}
//                 >
//                   {t(row.proKey)}
//                 </Text>
//               </View>
//             </View>
//           ))}
//         </View>

//         <View style={styles.radioRow}>
//           <View style={styles.radioFeatureSpacer} />
//           <TouchableOpacity
//             style={styles.radioCol}
//             onPress={() => setSelectedTier("starter")}
//             disabled={purchasing}
//             activeOpacity={0.7}
//           >
//             <View
//               style={[
//                 styles.radioCircleOuter,
//                 {
//                   borderColor: !isProSelected ? colors.active : colors.inactive,
//                 },
//               ]}
//             >
//               <View
//                 style={[
//                   styles.radioCircleInner,
//                   {
//                     backgroundColor: !isProSelected
//                       ? colors.active
//                       : colors.inactive,
//                   },
//                 ]}
//               />
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.radioCol}
//             onPress={() => setSelectedTier("pro")}
//             disabled={purchasing}
//             activeOpacity={0.7}
//           >
//             <View
//               style={[
//                 styles.radioCircleOuter,
//                 {
//                   borderColor: isProSelected ? colors.active : colors.inactive,
//                 },
//               ]}
//             >
//               <View
//                 style={[
//                   styles.radioCircleInner,
//                   {
//                     backgroundColor: isProSelected
//                       ? colors.active
//                       : colors.inactive,
//                   },
//                 ]}
//               />
//             </View>
//           </TouchableOpacity>
//         </View>

//         {isProSelected && (
//           <View
//             style={[
//               styles.purchaseArea,
//               { borderColor: colors.borderColor, backgroundColor: colors.card },
//             ]}
//           >
//             <View
//               style={[
//                 styles.toggleTrack,
//                 {
//                   backgroundColor: colors.background,
//                   borderColor: colors.borderColor,
//                 },
//               ]}
//             >
//               <TouchableOpacity
//                 style={[
//                   styles.toggleOption,
//                   billingCycle === "yearly" && {
//                     backgroundColor: colors.active,
//                     borderRadius: 8,
//                   },
//                 ]}
//                 onPress={() => setBillingCycle("yearly")}
//                 activeOpacity={0.8}
//               >
//                 <Text
//                   style={[
//                     styles.toggleLabel,
//                     {
//                       color:
//                         billingCycle === "yearly" ? "#fff" : colors.subtext,
//                     },
//                   ]}
//                 >
//                   {t("Paywall.Yearly")}
//                 </Text>
//                 {savingsPercent > 0 && (
//                   <Text
//                     style={[
//                       styles.toggleBadge,
//                       {
//                         color:
//                           billingCycle === "yearly"
//                             ? "rgba(255,255,255,0.85)"
//                             : colors.active,
//                       },
//                     ]}
//                   >
//                     {t("Paywall.Off", { percent: savingsPercent })}
//                   </Text>
//                 )}
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.toggleOption,
//                   billingCycle === "monthly" && {
//                     backgroundColor: colors.active,
//                     borderRadius: 8,
//                   },
//                 ]}
//                 onPress={() => setBillingCycle("monthly")}
//                 activeOpacity={0.8}
//               >
//                 <Text
//                   style={[
//                     styles.toggleLabel,
//                     {
//                       color:
//                         billingCycle === "monthly" ? "#fff" : colors.subtext,
//                     },
//                   ]}
//                 >
//                   {t("Paywall.Monthly")}
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <TouchableOpacity
//               style={[
//                 styles.purchaseButton,
//                 { backgroundColor: colors.active },
//                 purchasing && styles.purchaseButtonDisabled,
//               ]}
//               onPress={handlePurchase}
//               disabled={purchasing}
//               activeOpacity={0.82}
//             >
//               {purchasing ? (
//                 <ActivityIndicator size="small" color="#fff" />
//               ) : (
//                 <View style={styles.purchaseButtonInner}>
//                   <Text style={styles.purchaseButtonText}>
//                     {billingCycle === "yearly"
//                       ? t("Paywall.UpgradeYearly")
//                       : t("Paywall.UpgradeMonthly")}
//                   </Text>
//                   {billingCycle === "yearly" && yearly ? (
//                     <View style={styles.priceBlock}>
//                       <Text style={styles.purchaseButtonPrice}>
//                         {t("Paywall.PricePerYear", {
//                           price: yearly.product.priceString,
//                         })}
//                       </Text>
//                     </View>
//                   ) : billingCycle === "monthly" && monthly ? (
//                     <Text style={styles.purchaseButtonPrice}>
//                       {t("Paywall.PricePerMonth", {
//                         price: monthly.product.priceString,
//                       })}
//                     </Text>
//                   ) : null}
//                 </View>
//               )}
//             </TouchableOpacity>
//           </View>
//         )}

//         <TouchableOpacity
//           style={styles.restoreButton}
//           onPress={handleRestore}
//           disabled={purchasing}
//           activeOpacity={0.6}
//         >
//           <Text style={[styles.restoreButtonText, { color: colors.subtext }]}>
//             {t("Paywall.Restore")}
//           </Text>
//         </TouchableOpacity>

//         <Text style={[styles.noticeText, { color: colors.subtext }]}>
//           {t("Paywall.Notice")}
//         </Text>
//       </ScrollView>

//       <SubscriptionInfoModal
//         visible={infoModal.visible}
//         variant={infoModal.variant}
//         overrideMessage={infoModal.overrideMessage}
//         onClose={handleInfoModalClose}
//         colors={colors}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 20,
//     paddingBottom: 48,
//   },

//   // ─── ヘッダー ───
//   header: {
//     marginBottom: 20,
//   },
//   backButton: {
//     alignSelf: "flex-start",
//   },
//   backButtonText: {
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: "700",
//     textAlign: "center",
//     marginBottom: 6,
//     letterSpacing: 0.3,
//   },
//   subtitle: {
//     fontSize: 13,
//     textAlign: "center",
//     marginBottom: 24,
//     lineHeight: 19,
//   },

//   // ─── 比較テーブル ───
//   table: {
//     borderRadius: 16,
//     borderWidth: StyleSheet.hairlineWidth,
//     overflow: "hidden",
//     marginBottom: 14,
//   },
//   tableHeaderRow: {
//     flexDirection: "row",
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   tableRow: {
//     flexDirection: "row",
//     minHeight: 52,
//   },
//   featureCol: {
//     flex: 1,
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     justifyContent: "center",
//   },
//   featureLabel: {
//     fontSize: 14,
//     fontWeight: "500",
//   },
//   planHeaderCol: {
//     width: 150,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 16,
//     paddingHorizontal: 6,
//     borderLeftWidth: StyleSheet.hairlineWidth,
//     gap: 3,
//   },
//   planHeaderName: {
//     fontSize: 15,
//     fontWeight: "700",
//     textAlign: "center",
//   },
//   planHeaderPrice: {
//     fontSize: 11,
//     textAlign: "center",
//     fontWeight: "500",
//   },
//   planDataCol: {
//     width: 150,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 14,
//     paddingHorizontal: 6,
//     borderLeftWidth: StyleSheet.hairlineWidth,
//   },
//   cellText: {
//     fontSize: 13,
//     textAlign: "center",
//   },
//   cellTextHighlight: {
//     fontWeight: "700",
//   },

//   // ─── ラジオ ───
//   radioRow: {
//     flexDirection: "row",
//     marginTop: 6,
//     marginBottom: 14,
//   },
//   radioFeatureSpacer: {
//     flex: 1,
//   },
//   radioCol: {
//     width: 150,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 8,
//   },
//   radioCircleOuter: {
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     borderWidth: 2,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   radioCircleInner: {
//     width: 11,
//     height: 11,
//     borderRadius: 6,
//   },

//   // ─── 購入エリア ───
//   purchaseArea: {
//     borderRadius: 16,
//     borderWidth: StyleSheet.hairlineWidth,
//     padding: 14,
//     gap: 12,
//     marginBottom: 8,
//   },
//   toggleTrack: {
//     flexDirection: "row",
//     borderRadius: 10,
//     borderWidth: StyleSheet.hairlineWidth,
//     padding: 4,
//     gap: 2,
//   },
//   toggleOption: {
//     flex: 1,
//     paddingVertical: 9,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 1,
//   },
//   toggleLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   toggleBadge: {
//     fontSize: 10,
//     fontWeight: "700",
//   },
//   purchaseButton: {
//     borderRadius: 12,
//     paddingVertical: 16,
//     paddingHorizontal: 20,
//     alignItems: "center",
//   },
//   purchaseButtonDisabled: {
//     opacity: 0.5,
//   },
//   purchaseButtonInner: {
//     alignItems: "center",
//     gap: 5,
//   },
//   purchaseButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "700",
//     letterSpacing: 0.2,
//   },
//   priceBlock: {
//     alignItems: "center",
//     gap: 2,
//   },
//   purchaseButtonPrice: {
//     color: "rgba(255,255,255,0.9)",
//     fontSize: 13,
//     fontWeight: "600",
//   },

//   // ─── 復元・注意 ───
//   restoreButton: {
//     padding: 14,
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   restoreButtonText: {
//     fontSize: 13,
//     fontWeight: "400",
//     textDecorationLine: "underline",
//   },
//   noticeText: {
//     fontSize: 12,
//     lineHeight: 18,
//     textAlign: "center",
//   },

//   // ─── エラー画面 ───
//   closeButtonCard: {
//     padding: 18,
//     borderRadius: 16,
//     alignItems: "center",
//     borderWidth: 1,
//     marginTop: 20,
//   },
//   closeButtonText: {
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   errorText: {
//     fontSize: 16,
//     textAlign: "center",
//     marginBottom: 20,
//   },
// });




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
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar as RNStatusBar,
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

// ─── 定数 ─────────────────────────────────────────────
const GOLD     = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.15)";
const BG       = "#08080e";

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
    labelKey:   "Paywall.GamesPerDay",
    starterKey: "Paywall.GamesLimit",
    proKey:     "Paywall.Unlimited",
    highlight:  true,
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
  const [offerings,    setOfferings]    = useState<PurchasesOffering | null>(null);
  const [loading,      setLoading]      = useState<boolean>(true);
  const [purchasing,   setPurchasing]   = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<SelectedTier>("starter");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [infoModal,    setInfoModal]    = useState<InfoModalState>(INITIAL_INFO_MODAL);

  useEffect(() => { loadOfferings(); }, []);

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
    if (selectedTier === "starter") { onDismiss?.(); return; }
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
    const yearlyPrice  = yearlyPkg.product.price;
    return Math.floor(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  };

  // ── ローディング ──
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <RNStatusBar barStyle="light-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  // ── エラー ──
  if (!offerings) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <RNStatusBar barStyle="light-content" backgroundColor={BG} />
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

  const packages       = offerings.availablePackages;
  const monthly        = packages.find((p) => p.product.identifier.startsWith("premium_monthly"));
  const yearly         = packages.find((p) => p.product.identifier.startsWith("premium_yearly"));
  const savingsPercent = calculateSavings(monthly, yearly);
  const isProSelected  = selectedTier === "pro";

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="light-content" backgroundColor={BG} />

      {/* 背景グリッド */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]} />
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 戻るボタン */}
        <TouchableOpacity style={styles.backButton} onPress={onDismiss} activeOpacity={0.7}>
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
              style={[styles.planHeaderCol, !isProSelected && styles.planHeaderColActive]}
              onPress={() => setSelectedTier("starter")}
              activeOpacity={0.8}
            >
              {!isProSelected && <View style={styles.planHeaderAccent} />}
              <Text style={[styles.planHeaderName, !isProSelected && styles.planHeaderNameActive]}>
                {t("Paywall.Starter")}
              </Text>
              <Text style={[styles.planHeaderSub, !isProSelected && styles.planHeaderSubActive]}>
                {t("Paywall.Free")}
              </Text>
            </TouchableOpacity>

            {/* Pro列 */}
            <TouchableOpacity
              style={[styles.planHeaderCol, isProSelected && styles.planHeaderColActive]}
              onPress={() => setSelectedTier("pro")}
              activeOpacity={0.8}
            >
              {isProSelected && <View style={styles.planHeaderAccent} />}
              <Text style={[styles.planHeaderName, isProSelected && styles.planHeaderNameActive]}>
                {t("Paywall.Pro")}
              </Text>
              <Text style={[styles.planHeaderSub, isProSelected && styles.planHeaderSubActive]}>
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
              <View style={[styles.planDataCol, !isProSelected && styles.planDataColActive]}>
                <Text style={styles.cellText}>{t(row.starterKey)}</Text>
              </View>
              <View style={[styles.planDataCol, isProSelected && styles.planDataColActive]}>
                <Text style={[styles.cellText, row.highlight && styles.cellTextHighlight]}>
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
                  <View style={[styles.radioOuter, { borderColor: active ? GOLD : "rgba(255,255,255,0.15)" }]}>
                    <View style={[styles.radioInner, { backgroundColor: active ? GOLD : "transparent" }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── 購入エリア（Pro選択時のみ） ─── */}
        {isProSelected && (
          <View style={styles.purchaseArea}>
            <View style={styles.cardAccentLine} />
            <View style={styles.purchaseAreaInner}>
              {/* 年/月トグル */}
              <View style={styles.toggleTrack}>
                {(["yearly", "monthly"] as BillingCycle[]).map((cycle) => {
                  const active = billingCycle === cycle;
                  return (
                    <TouchableOpacity
                      key={cycle}
                      style={[styles.toggleOption, active && styles.toggleOptionActive]}
                      onPress={() => setBillingCycle(cycle)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                        {t(cycle === "yearly" ? "Paywall.Yearly" : "Paywall.Monthly")}
                      </Text>
                      {cycle === "yearly" && savingsPercent > 0 && (
                        <Text style={[styles.toggleBadge, active && styles.toggleBadgeActive]}>
                          {t("Paywall.Off", { percent: savingsPercent })}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 購入ボタン */}
              <TouchableOpacity
                style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
                onPress={handlePurchase}
                disabled={purchasing}
                activeOpacity={0.82}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color={BG} />
                ) : (
                  <View style={styles.purchaseButtonInner}>
                    <Text style={styles.purchaseButtonText}>
                      {billingCycle === "yearly" ? t("Paywall.UpgradeYearly") : t("Paywall.UpgradeMonthly")}
                    </Text>
                    {billingCycle === "yearly" && yearly ? (
                      <Text style={styles.purchaseButtonPrice}>
                        {t("Paywall.PricePerYear", { price: yearly.product.priceString })}
                      </Text>
                    ) : billingCycle === "monthly" && monthly ? (
                      <Text style={styles.purchaseButtonPrice}>
                        {t("Paywall.PricePerMonth", { price: monthly.product.priceString })}
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
    backgroundColor: BG,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // 背景グリッド
  bgLineV: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "rgba(201,168,76,0.05)",
  },
  bgLineH: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 1,
    backgroundColor: "rgba(201,168,76,0.05)",
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
    fontWeight: "600",
    color: GOLD,
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
    fontWeight: "600",
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f0ebe3",
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
    height: 1,
    backgroundColor: GOLD_DIM,
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
    color: "rgba(201,168,76,0.5)",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  // テーブル
  table: {
    backgroundColor: "#0d0d16",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD_DIM,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GOLD_DIM,
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 52,
  },
  tableRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GOLD_DIM,
  },
  featureCol: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(240,235,227,0.6)",
  },
  planHeaderCol: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: GOLD_DIM,
    overflow: "hidden",
    gap: 4,
  },
  planHeaderColActive: {
    backgroundColor: "rgba(201,168,76,0.08)",
  },
  planHeaderAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: GOLD,
    opacity: 0.7,
  },
  planHeaderName: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(240,235,227,0.35)",
    textAlign: "center",
  },
  planHeaderNameActive: {
    color: GOLD,
  },
  planHeaderSub: {
    fontSize: 11,
    color: "rgba(240,235,227,0.25)",
    fontWeight: "500",
  },
  planHeaderSubActive: {
    color: GOLD,
    fontWeight: "600",
  },
  planDataCol: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: GOLD_DIM,
  },
  planDataColActive: {
    backgroundColor: "rgba(201,168,76,0.06)",
  },
  cellText: {
    fontSize: 13,
    textAlign: "center",
    color: "rgba(240,235,227,0.45)",
  },
  cellTextHighlight: {
    fontWeight: "800",
    color: GOLD,
  },

  // ラジオ
  radioRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: GOLD_DIM,
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
    borderWidth: 2,
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
    backgroundColor: "#0d0d16",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: GOLD,
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardAccentLine: {
    height: 2,
    backgroundColor: GOLD,
    opacity: 0.6,
  },
  purchaseAreaInner: {
    padding: 14,
    gap: 12,
  },
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD_DIM,
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
    color: "rgba(240,235,246,0.4)",
  },
  toggleLabelActive: {
    color: BG,
  },
  toggleBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: GOLD,
  },
  toggleBadgeActive: {
    color: BG,
  },
  purchaseButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonInner: {
    alignItems: "center",
    gap: 4,
  },
  purchaseButtonText: {
    color: BG,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  purchaseButtonPrice: {
    color: "rgba(8,8,14,0.65)",
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
    color: "rgba(201,168,76,0.4)",
    textDecorationLine: "underline",
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    color: "rgba(255,255,255,0.2)",
  },

  // エラーカード
  errorCard: {
    width: "100%",
    backgroundColor: "#0d0d16",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD_DIM,
    overflow: "hidden",
  },
  errorCardInner: {
    padding: 24,
    alignItems: "center",
    gap: 20,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    color: "rgba(240,235,227,0.5)",
    lineHeight: 22,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD_DIM,
    backgroundColor: "rgba(201,168,76,0.08)",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: GOLD,
  },
});