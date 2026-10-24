// SettingsScreen.tsx

import { MyText } from "@/src/components/common/MyText";
import { VersionModal } from "@/src/components/modals/common/VersionModal";
import { AllowBotMatchModal } from "@/src/components/modals/settingsScreen/AllowBotMatchModal";
import { DeleteModal } from "@/src/components/modals/settingsScreen/DeleteModal";
import { DoubleTapModal } from "@/src/components/modals/settingsScreen/DoubleTapModal";
import { LanguageModal } from "@/src/components/modals/settingsScreen/LanguageModal";
import { LoginModal } from "@/src/components/modals/settingsScreen/LoginModal";
import { LogoutModal } from "@/src/components/modals/settingsScreen/LogoutModal";
import { ThemeModal } from "@/src/components/modals/settingsScreen/ThemeModal";
import { SettingsRow } from "@/src/components/settings/SettingsRow";
import { SettingsSection } from "@/src/components/settings/SettingsSection";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useBlurActiveElement } from "@/src/hooks/common/useBlurActiveElement";
import { useColors, useThemeMode } from "@/src/hooks/common/useTheme";
import { useSettingsScreen } from "@/src/hooks/screens/useSettingsScreen";
import { useTranslation } from "@/src/i18n/LangProvider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Linking,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyHeader, ToggleSwitch } from "ui-atoms";
import { openWebPurchase } from "../services/revenuecat";

export default function SettingsScreen() {
  const t = useTranslation();
  const colors = useColors();
  const { mode } = useThemeMode();
  const { show, hide } = useOverlay();
  const { username, email, isAnonymous, uid, isPremium } = useProfile();
  const {
    loading,
    isDisabled,
    isMatching,
    onLogout,
    handleConfirmDelete,
    lang,
    isSoundEnabled,
    setIsSoundEnabled,
  } = useSettingsScreen();

  useBlurActiveElement();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <View className="flex-1 w-full max-w-160 mx-auto px-4 pt-2">
        <MyHeader
          left={
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace({ pathname: "/ProfileScreen" });
                }
              }}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={36} color={colors.textSub} />
            </TouchableOpacity>
          }
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* アカウントセクション */}
          <SettingsSection title={t("Settings.accountInfo")}>
            <SettingsRow
              label={t("common.email")}
              // emailがあるときは onPress を渡さない（undefinedにする）！
              onPress={
                email
                  ? undefined // ⚠️これが大事！
                  : () => show(<LoginModal visible={true} onClose={hide} />)
              }
              rightElement={
                <MyText className="text-lg text-textSub tracking-wide">
                  {email ? email : t("Settings.notSet")}
                </MyText>
              }
            />

            <SettingsRow
              label={t("common.plan")}
              onPress={async () => {
                if (Platform.OS === "web") {
                  if (!uid) return;
                  if (isPremium) {
                    // Webのプレミアム会員は購読管理ページへ
                    const info = await Purchases.getCustomerInfo();
                    if (info.managementURL)
                      await Linking.openURL(info.managementURL);
                    return;
                  }
                  await openWebPurchase(uid);
                  return;
                }

                if (isPremium) {
                  // プレミアム会員はカスタマーセンター（プラン確認・解約・復元）
                  await RevenueCatUI.presentCustomerCenter();
                } else {
                  // 未購入の人はペイウォール
                  await RevenueCatUI.presentPaywall();
                }
              }}
              rightElement={
                <MyText className="text-lg text-textSub tracking-wide">
                  {isPremium
                    ? t("premium.premiumPlan")
                    : t("premium.startPlan")}
                </MyText>
              }
            />
          </SettingsSection>
          {/* 対局セクション */}
          <SettingsSection title={t("Settings.matchSettings")}>
            <SettingsRow
              label={t("Settings.allowBotMatch")}
              onPress={() =>
                show(
                  <AllowBotMatchModal isMatching={isMatching} onClose={hide} />,
                )
              }
            />
            <SettingsRow
              label={t("Settings.doubleTap")}
              onPress={() => show(<DoubleTapModal onClose={hide} />)}
            />
          </SettingsSection>
          {/* デバイスセクション */}
          <SettingsSection title={t("common.device")}>
            <SettingsRow
              label={t("common.sound")}
              rightElement={
                <ToggleSwitch
                  value={isSoundEnabled}
                  onToggle={(val) => setIsSoundEnabled(val)}
                  backgroundOnColor={colors.primary}
                  backgroundOffColor={colors.backgroundStrong}
                  toggleColor={colors.foreground}
                />
              }
            />

            <SettingsRow
              label={t("common.language")}
              onPress={() => {
                show(<LanguageModal onClose={hide} />);
              }}
              rightElement={
                <MyText className="text-lg text-textSub tracking-wide">
                  {t(`language.${lang}`)}
                </MyText>
              }
            />

            <SettingsRow
              label={t("theme.theme")}
              onPress={() => show(<ThemeModal onClose={hide} />)}
              rightElement={
                <MyText className="text-lg text-textSub tracking-wide">
                  {t(`theme.${mode}`)}
                </MyText>
              }
            />
          </SettingsSection>
          {/* 情報セクション */}
          <SettingsSection title={t("common.information")}>
            <SettingsRow
              label={t("Settings.privacyPolicy")}
              onPress={() => Linking.openURL("https://mokuyoubi.org/privacy")}
            />
            <SettingsRow
              label={t("Settings.termsOfService")}
              onPress={() => Linking.openURL("https://mokuyoubi.org/terms")}
            />
            <SettingsRow
              label={t("Settings.licenses")}
              onPress={() => Linking.openURL("https://mokuyoubi.org/licenses")}
            />
            <SettingsRow
              label={t("common.version")}
              onPress={() => show(<VersionModal onClose={hide} />)}
            />
          </SettingsSection>
          {/* ログアウト＆削除ボタン */}
          <View className="gap-3">
            {/* ログアウトボタン */}
            {!isAnonymous && (
              <TouchableOpacity
                className={`h-14 w-full rounded-xl justify-center items-center bg-foreground ${
                  isDisabled
                    ? "border-backgroundStrong"
                    : "border-primaryStrong"
                } border-2`}
                disabled={loading}
                activeOpacity={0.8}
                onPress={() => {
                  show(
                    <LogoutModal
                      onConfirm={async () => {
                        await onLogout();
                        hide();
                      }}
                      onCancel={hide}
                    />,
                  );
                }}
              >
                <MyText
                  className={`text-lg ${
                    isDisabled ? "text-backgroundStrong" : "text-primaryStrong"
                  } tracking-wide`}
                >
                  {t("common.logout")}
                </MyText>
              </TouchableOpacity>
            )}

            {/* 削除ボタン */}
            <TouchableOpacity
              className={`h-14 w-full rounded-xl justify-center items-center bg-foreground border-2 ${
                isDisabled ? "border-failureLight" : "border-failure"
              }`}
              disabled={loading}
              activeOpacity={0.8}
              onPress={() => {
                show(
                  <DeleteModal
                    username={username ?? ""}
                    onConfirm={async () => {
                      await handleConfirmDelete();
                      hide();
                    }}
                    onCancel={hide}
                  />,
                );
              }}
            >
              <MyText
                className={`text-lg ${
                  isDisabled ? "text-failureLight" : "text-failure"
                } tracking-wide`}
              >
                {t("Settings.deleteAccount")}
              </MyText>
            </TouchableOpacity>

            {/* 削除ボタンの下の隙間 */}
            <View className="h-8" />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
