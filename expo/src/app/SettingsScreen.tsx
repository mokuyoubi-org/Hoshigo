// SettingsScreen.tsx

import { MyText } from "@/src/components/common/MyText";
import { VersionModal } from "@/src/components/modals/common/VersionModal";
import { AllowBotMatchModal } from "@/src/components/modals/settings/AllowBotMatchModal";
import { DeleteModal } from "@/src/components/modals/settings/DeleteModal";
import { DoubleTapModal } from "@/src/components/modals/settings/DoubleTapModal";
import { LanguageModal } from "@/src/components/modals/settings/LanguageModal";
import { LoginModal } from "@/src/components/modals/settings/LoginModal";
import { LogoutModal } from "@/src/components/modals/settings/LogoutModal";
import { ThemeModal } from "@/src/components/modals/settings/ThemeModal";
import { SettingsRow } from "@/src/components/settings/SettingsRow";
import { SettingsSection } from "@/src/components/settings/SettingsSection";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors, useThemeMode } from "@/src/hooks/common/useTheme";
import { useSettingsScreen } from "@/src/hooks/screens/useSettingsScreen";
import { useTranslation } from "@/src/i18n/LangProvider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, ToggleSwitch } from "ui-atoms";
import { useBlurActiveElement } from "../hooks/common/useBlurActiveElement";

export default function SettingsScreen() {
  const t = useTranslation();
  const colors = useColors();
  const { mode } = useThemeMode();
  const { show, hide } = useOverlay();
  const { username, email, isAnonymous } = useProfile();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="w-full max-w-160 mx-auto px-4 pt-2">
          <ScreenHeader
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

          <MyText
            className="text-3xl text-text tracking-wider mb-4 h-10" // h-10が大事
          >
            {t("common.settings")}
          </MyText>

          <SettingsSection title={t("Settings.accountInfo")}>
            <SettingsRow
              label={t("common.email")}
              onPress={() =>
                show(!email && <LoginModal visible={true} onClose={hide} />)
              }
              rightElement={
                <MyText className="text-lg text-textSub tracking-wide">
                  {email ? email : t("Settings.notSet")}
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
              label={t("common.version")}
              onPress={() => show(<VersionModal onClose={hide} />)}
            />
          </SettingsSection>

          <View className="gap-3">
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
