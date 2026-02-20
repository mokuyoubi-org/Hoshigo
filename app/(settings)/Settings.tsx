// import LoginNeededModal from "@/src/components/LoginNeededModal";
// import { router } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import React, { useContext, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Linking,
//   Modal,
//   StatusBar as RNStatusBar,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import CustomCustomerCenterScreen from "../(premium)/CustomCustomerCenter";
// import CustomPaywallScreen from "../(premium)/CustomPayWall";

// import { logoutRevenueCat } from "@/src/services/RevenueCat";
// import LoadingOverlay from "../../src/components/LoadingOverlay";
// import { EmailContext, UidContext } from "../../src/components/UserContexts";
// import { useRevenueCat } from "../../src/hooks/useRevenueCat";
// import { useTheme } from "../../src/hooks/useTheme";
// import { supabase } from "../../src/services/supabase";

// // ─── 定数 ─────────────────────────────────────────────
// const GOLD = "#c9a84c";
// const BG = "#08080e";
// const DANGER = "#e05c5c";

// export default function Settings() {
//   const { t, i18n } = useTranslation();
//   const { colors } = useTheme();

//   // ── ロジック（変更なし） ──
//   const [loading, setLoading] = useState(false);
//   const email = useContext<string | null>(EmailContext);
//   const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
//   const uid = useContext(UidContext);
//   const { isPro } = useRevenueCat();
//   const [showPaywall, setShowPaywall] = useState(false);
//   const [showCustomerCenter, setShowCustomerCenter] = useState(false);

//   const onLogout = async () => {
//     setLoading(true);
//     await supabase.auth.signOut();
//     await logoutRevenueCat();
//     setLoading(false);
//   };

//   const onDelete = async () => {
//     if (!uid) {
//       setIsLoginModalVisible(true);
//     } else {
//       router.push("/Delete");
//     }
//   };

//   const onPremium = () => {
//     if (!uid) {
//       setIsLoginModalVisible(true);
//     } else {
//       if (isPro) {
//         setShowCustomerCenter(true);
//       } else {
//         setShowPaywall(true);
//       }
//     }
//   };

//   const onDesignChange = () => {
//     router.push("/Design");
//   };

//   const openURL = (url: string) => {
//     Linking.openURL(url).catch((err) =>
//       console.error("URLを開けませんでした:", err),
//     );
//   };

//   const currentLanguageLabel =
//     (
//       { zh: "中文", ko: "한국어", ja: "日本語", en: "English" } as Record<
//         string,
//         string
//       >
//     )[i18n.language.split("-")[0]] ?? i18n.language;

//   // ── UI ──
//   return (
//     <SafeAreaView style={styles.container}>
//       <RNStatusBar barStyle="light-content" backgroundColor={BG} />
//       <StatusBar style="light" />

//       {/* 背景グリッド */}
//       <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
//         {Array.from({ length: 5 }).map((_, i) => (
//           <View
//             key={`v${i}`}
//             style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]}
//           />
//         ))}
//         {Array.from({ length: 7 }).map((_, i) => (
//           <View
//             key={`h${i}`}
//             style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]}
//           />
//         ))}
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={styles.content}>
//           {/* ─── ヘッダー ─── */}
//           <View style={styles.header}>
//             <TouchableOpacity
//               style={styles.backButton}
//               onPress={() => router.push("/(tabs)/MyPage")}
//               activeOpacity={0.7}
//             >
//               <Text style={styles.backButtonText}>‹ {t("Settings.back")}</Text>
//             </TouchableOpacity>
//             <View style={styles.pageTitleRow}>
//               <View style={styles.pageTitleAccent} />
//               <Text style={styles.pageTitle}>{t("Settings.title")}</Text>
//             </View>
//           </View>

//           {/* ─── アカウント情報 ─── */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>{t("Settings.accountInfo")}</Text>
//             <View style={styles.infoCard}>
//               <Text style={styles.infoLabel}>{t("Settings.email")}</Text>
//               <Text style={styles.infoValue}>
//                 {email || t("Settings.notSet")}
//               </Text>
//             </View>
//           </View>

//           {/* ─── プラン ─── */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>{t("Settings.plan")}</Text>
//             <TouchableOpacity
//               style={[styles.menuItem, isPro && styles.menuItemPro]}
//               activeOpacity={0.7}
//               onPress={onPremium}
//             >
//               {isPro && (
//                 <View
//                   style={[styles.cardAccentLine, { backgroundColor: GOLD }]}
//                 />
//               )}
//               <View style={styles.menuItemInner}>
//                 <View style={styles.menuItemLeft}>
//                   <View
//                     style={[
//                       styles.menuIconWrapper,
//                       isPro && styles.menuIconWrapperPro,
//                     ]}
//                   >
//                     <Text style={styles.menuIconEmoji}>
//                       {isPro ? "✨" : "🎮"}
//                     </Text>
//                   </View>
//                   <View>
//                     <Text style={styles.infoLabel}>
//                       {t("Settings.currentPlan")}
//                     </Text>
//                     <Text style={[styles.planValue, isPro && { color: GOLD }]}>
//                       {isPro
//                         ? t("Settings.premiumPlan")
//                         : t("Settings.startPlan")}
//                     </Text>
//                   </View>
//                 </View>
//                 <Text style={styles.menuItemArrow}>›</Text>
//               </View>
//             </TouchableOpacity>
//           </View>

//           {/* ─── カスタマイズ ─── */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>{t("Settings.customize")}</Text>
//             <View style={styles.infoCard}>
//               <Text style={styles.infoLabel}>{t("Settings.language")}</Text>
//               <Text style={styles.infoValue}>{currentLanguageLabel}</Text>
//             </View>
//           </View>

//           {/* ─── 情報 ─── */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>{t("Settings.information")}</Text>
//             <View style={styles.menuGroup}>
//               {[
//                 {
//                   label: t("Settings.privacyPolicy"),
//                   url: "https://mokuyoubi.org/privacy",
//                 },
//                 {
//                   label: t("Settings.termsOfService"),
//                   url: "https://mokuyoubi.org/terms",
//                 },
//                 {
//                   label: t("Settings.license"),
//                   url: "https://mokuyoubi.org/license",
//                 },
//               ].map((item, i, arr) => (
//                 <TouchableOpacity
//                   key={item.url}
//                   style={[
//                     styles.menuItem,
//                     i < arr.length - 1 && styles.menuItemBorderBottom,
//                     {
//                       borderRadius:
//                         i === 0 ? 14 : i === arr.length - 1 ? 14 : 0,
//                     },
//                   ]}
//                   activeOpacity={0.7}
//                   onPress={() => openURL(item.url)}
//                 >
//                   <View style={styles.menuItemInner}>
//                     <Text style={styles.menuItemText}>{item.label}</Text>
//                     <Text style={styles.menuItemArrow}>›</Text>
//                   </View>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* ─── アカウント操作 ─── */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>
//               {t("Settings.accountActions")}
//             </Text>

//             <TouchableOpacity
//               style={[
//                 styles.actionButton,
//                 loading && styles.actionButtonDisabled,
//               ]}
//               disabled={loading}
//               activeOpacity={0.8}
//               onPress={onLogout}
//             >
//               <Text style={styles.actionButtonText}>
//                 {t("Settings.logout")}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.dangerButton}
//               activeOpacity={0.8}
//               onPress={onDelete}
//             >
//               <Text style={styles.dangerButtonText}>
//                 {t("Settings.deleteAccount")}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* ─── モーダル類（変更なし） ─── */}
//         <LoginNeededModal
//           visible={isLoginModalVisible}
//           onClose={() => setIsLoginModalVisible(false)}
//           message={t("Settings.loginRequired")}
//         />
//         <Modal
//           visible={showPaywall}
//           animationType="slide"
//           presentationStyle="pageSheet"
//           onRequestClose={() => setShowPaywall(false)}
//         >
//           <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} />
//         </Modal>
//         <Modal
//           visible={showCustomerCenter}
//           animationType="slide"
//           presentationStyle="pageSheet"
//           onRequestClose={() => setShowCustomerCenter(false)}
//         >
//           <CustomCustomerCenterScreen
//             onDismiss={() => setShowCustomerCenter(false)}
//           />
//         </Modal>

//         {loading && <LoadingOverlay text={t("Settings.loggingOut")} />}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// // ─── スタイル ──────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BG,
//   },

//   // 背景グリッド
//   bgLineV: {
//     position: "absolute",
//     top: 0,
//     width: 1,
//     height: "100%",
//     backgroundColor: "rgba(201,168,76,0.05)",
//   },
//   bgLineH: {
//     position: "absolute",
//     left: 0,
//     width: "100%",
//     height: 1,
//     backgroundColor: "rgba(201,168,76,0.05)",
//   },

//   scrollView: { flex: 1 },
//   content: {
//     paddingHorizontal: 20,
//     paddingTop: 16,
//     paddingBottom: 48,
//     gap: 8,
//   },

//   // ─── ヘッダー ───
//   header: {
//     marginBottom: 24,
//   },
//   backButton: {
//     marginBottom: 16,
//     alignSelf: "flex-start",
//   },
//   backButtonText: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: GOLD,
//     letterSpacing: 0.3,
//   },
//   pageTitleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },
//   pageTitleAccent: {
//     width: 3,
//     height: 28,
//     borderRadius: 2,
//     backgroundColor: GOLD,
//     shadowColor: GOLD,
//     shadowOpacity: 0.8,
//     shadowRadius: 6,
//   },
//   pageTitle: {
//     fontSize: 28,
//     fontWeight: "800",
//     color: "#f0ebe3",
//     letterSpacing: 1,
//   },

//   // ─── セクション ───
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 11,
//     fontWeight: "700",
//     textTransform: "uppercase",
//     letterSpacing: 2,
//     color: "rgba(201,168,76,0.5)",
//     marginBottom: 10,
//     marginLeft: 4,
//   },

//   // ─── インフォカード ───
//   infoCard: {
//     backgroundColor: "#0d0d16",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.12)",
//     paddingHorizontal: 18,
//     paddingVertical: 16,
//   },
//   infoLabel: {
//     fontSize: 11,
//     fontWeight: "600",
//     color: "rgba(201,168,76,0.5)",
//     letterSpacing: 1,
//     marginBottom: 6,
//     textTransform: "uppercase",
//   },
//   infoValue: {
//     fontSize: 15,
//     fontWeight: "500",
//     color: "rgba(240,235,227,0.8)",
//     letterSpacing: 0.2,
//   },

//   // ─── メニューアイテム共通 ───
//   menuItem: {
//     backgroundColor: "#0d0d16",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.12)",
//     overflow: "hidden",
//     marginBottom: 8,
//   },
//   menuItemPro: {
//     borderColor: "rgba(201,168,76,0.3)",
//   },
//   menuItemBorderBottom: {
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(201,168,76,0.08)",
//     borderRadius: 0,
//     marginBottom: 0,
//   },
//   menuItemInner: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 18,
//     paddingVertical: 16,
//   },
//   menuItemLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//     flex: 1,
//   },
//   menuIconWrapper: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: "rgba(201,168,76,0.08)",
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.15)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   menuIconWrapperPro: {
//     backgroundColor: "rgba(201,168,76,0.15)",
//     borderColor: "rgba(201,168,76,0.35)",
//   },
//   menuIconEmoji: {
//     fontSize: 18,
//   },
//   menuItemText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "rgba(240,235,227,0.8)",
//     letterSpacing: 0.3,
//   },
//   menuItemArrow: {
//     fontSize: 24,
//     fontWeight: "300",
//     color: "rgba(201,168,76,0.35)",
//   },
//   planValue: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "rgba(240,235,227,0.85)",
//     letterSpacing: 0.3,
//   },
//   cardAccentLine: {
//     height: 2,
//     opacity: 0.6,
//     shadowOpacity: 0.8,
//     shadowRadius: 4,
//   },

//   // ─── メニューグループ（情報セクション） ───
//   menuGroup: {
//     backgroundColor: "#0d0d16",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.12)",
//     overflow: "hidden",
//   },

//   // ─── アクションボタン ───
//   actionButton: {
//     height: 52,
//     borderRadius: 14,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#0d0d16",
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.2)",
//     marginBottom: 10,
//   },
//   actionButtonDisabled: {
//     opacity: 0.4,
//   },
//   actionButtonText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "rgba(240,235,227,0.7)",
//     letterSpacing: 0.5,
//   },
//   dangerButton: {
//     height: 52,
//     borderRadius: 14,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(224,92,92,0.06)",
//     borderWidth: 1,
//     borderColor: "rgba(224,92,92,0.3)",
//   },
//   dangerButtonText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: DANGER,
//     letterSpacing: 0.5,
//   },
// });




import LoginNeededModal from "@/src/components/LoginNeededModal";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Linking,
  Modal,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomCustomerCenterScreen from "../(premium)/CustomCustomerCenter";
import CustomPaywallScreen from "../(premium)/CustomPayWall";

import { logoutRevenueCat } from "@/src/services/RevenueCat";
import LoadingOverlay from "../../src/components/LoadingOverlay";
import { EmailContext, UidContext } from "../../src/components/UserContexts";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import { useTheme } from "../../src/hooks/useTheme";
import { supabase } from "../../src/services/supabase";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";
const DANGER = "#e05c5c";
const GOLD = "#d4af37"; // プレミアム用

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  // ── ロジック（変更なし） ──
  const [loading, setLoading] = useState(false);
  const email = useContext<string | null>(EmailContext);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const uid = useContext(UidContext);
  const { isPro } = useRevenueCat();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    await logoutRevenueCat();
    setLoading(false);
  };

  const onDelete = async () => {
    if (!uid) {
      setIsLoginModalVisible(true);
    } else {
      router.push("/Delete");
    }
  };

  const onPremium = () => {
    if (!uid) {
      setIsLoginModalVisible(true);
    } else {
      if (isPro) {
        setShowCustomerCenter(true);
      } else {
        setShowPaywall(true);
      }
    }
  };

  const onDesignChange = () => {
    router.push("/Design");
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("URLを開けませんでした:", err),
    );
  };

  const currentLanguageLabel =
    (
      { zh: "中文", ko: "한국어", ja: "日本語", en: "English" } as Record<
        string,
        string
      >
    )[i18n.language.split("-")[0]] ?? i18n.language;

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      {/* 背景グリッド（優しい色に） */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]}
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* ─── ヘッダー ─── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/MyPage")}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹ {t("Settings.back")}</Text>
            </TouchableOpacity>
            <View style={styles.pageTitleRow}>
              <View style={styles.pageTitleAccent} />
              <Text style={styles.pageTitle}>{t("Settings.title")}</Text>
            </View>
          </View>

          {/* ─── アカウント情報 ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Settings.accountInfo")}</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("Settings.email")}</Text>
              <Text style={styles.infoValue}>
                {email || t("Settings.notSet")}
              </Text>
            </View>
          </View>

          {/* ─── プラン ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Settings.plan")}</Text>
            <TouchableOpacity
              style={[styles.menuItem, isPro && styles.menuItemPro]}
              activeOpacity={0.7}
              onPress={onPremium}
            >
              {isPro && (
                <View
                  style={[styles.cardAccentLine, { backgroundColor: GOLD }]}
                />
              )}
              <View style={styles.menuItemInner}>
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuIconWrapper,
                      isPro && styles.menuIconWrapperPro,
                    ]}
                  >
                    <Text style={styles.menuIconEmoji}>
                      {isPro ? "✨" : "🎮"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>
                      {t("Settings.currentPlan")}
                    </Text>
                    <Text style={[styles.planValue, isPro && { color: GOLD }]}>
                      {isPro
                        ? t("Settings.premiumPlan")
                        : t("Settings.startPlan")}
                    </Text>
                  </View>
                </View>
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ─── カスタマイズ ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Settings.customize")}</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("Settings.language")}</Text>
              <Text style={styles.infoValue}>{currentLanguageLabel}</Text>
            </View>
          </View>

          {/* ─── 情報 ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Settings.information")}</Text>
            <View style={styles.menuGroup}>
              {[
                {
                  label: t("Settings.privacyPolicy"),
                  url: "https://mokuyoubi.org/privacy",
                },
                {
                  label: t("Settings.termsOfService"),
                  url: "https://mokuyoubi.org/terms",
                },
                {
                  label: t("Settings.license"),
                  url: "https://mokuyoubi.org/license",
                },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.url}
                  style={[
                    styles.menuItem,
                    i < arr.length - 1 && styles.menuItemBorderBottom,
                    {
                      borderRadius:
                        i === 0 ? 14 : i === arr.length - 1 ? 14 : 0,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => openURL(item.url)}
                >
                  <View style={styles.menuItemInner}>
                    <Text style={styles.menuItemText}>{item.label}</Text>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── アカウント操作 ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("Settings.accountActions")}
            </Text>

            <TouchableOpacity
              style={[
                styles.actionButton,
                loading && styles.actionButtonDisabled,
              ]}
              disabled={loading}
              activeOpacity={0.8}
              onPress={onLogout}
            >
              <Text style={styles.actionButtonText}>
                {t("Settings.logout")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.8}
              onPress={onDelete}
            >
              <Text style={styles.dangerButtonText}>
                {t("Settings.deleteAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── モーダル類（変更なし） ─── */}
        <LoginNeededModal
          visible={isLoginModalVisible}
          onClose={() => setIsLoginModalVisible(false)}
          message={t("Settings.loginRequired")}
        />
        <Modal
          visible={showPaywall}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPaywall(false)}
        >
          <CustomPaywallScreen onDismiss={() => setShowPaywall(false)} />
        </Modal>
        <Modal
          visible={showCustomerCenter}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCustomerCenter(false)}
        >
          <CustomCustomerCenterScreen
            onDismiss={() => setShowCustomerCenter(false)}
          />
        </Modal>

        {loading && <LoadingOverlay text={t("Settings.loggingOut")} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
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

  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 8,
  },

  // ─── ヘッダー ───
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.3,
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitleAccent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: STRAWBERRY,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1,
  },

  // ─── セクション ───
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CHOCOLATE_SUB,
    marginBottom: 10,
    marginLeft: 4,
  },

  // ─── インフォカード ───
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: CHOCOLATE_SUB,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: CHOCOLATE,
    letterSpacing: 0.2,
  },

  // ─── メニューアイテム共通 ───
  menuItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  menuItemPro: {
    borderColor: `${GOLD}50`,
    shadowColor: GOLD,
    shadowOpacity: 0.15,
  },
  menuItemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
    borderRadius: 0,
    marginBottom: 0,
  },
  menuItemInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(200,214,230,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconWrapperPro: {
    backgroundColor: `${GOLD}15`,
    borderColor: `${GOLD}40`,
  },
  menuIconEmoji: {
    fontSize: 18,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  menuItemArrow: {
    fontSize: 24,
    fontWeight: "300",
    color: CHOCOLATE_SUB,
    opacity: 0.5,
  },
  planValue: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  cardAccentLine: {
    height: 2.5,
    opacity: 0.6,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },

  // ─── メニューグループ（情報セクション） ───
  menuGroup: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  // ─── アクションボタン ───
  actionButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    marginBottom: 10,
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  dangerButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(224,92,92,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(224,92,92,0.3)",
    shadowColor: DANGER,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: DANGER,
    letterSpacing: 0.5,
  },
});