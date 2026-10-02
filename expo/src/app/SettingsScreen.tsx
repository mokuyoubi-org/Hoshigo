import { DeleteModal } from "@/src/active/components/modals/DeleteModal";
import { LogoutModal } from "@/src/active/components/modals/LogoutModal";

import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useSettingsScreen } from "@/src/active/hooks/screens/useSettingsScreen";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { openURL } from "@/src/stable/logics/linking";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ToggleSwitch } from "ui-atoms";
import { AppText } from "../active/components/common/AppText";
import { SettingsRow } from "../active/components/common/SettingsRow";
import { SettingsSection } from "../active/components/common/SettingsSection";
import { DoubleTapModal } from "../active/components/modals/DoubleTapModal";
import { EmailChangeModal } from "../active/components/modals/EmailChangeModal";
import { LanguageModal } from "../active/components/modals/LanguageModal";
import { LoginModal } from "../active/components/modals/LoginModal";
import { ThemeModal } from "../active/components/modals/ThemeModal";
import { VersionModal } from "../active/components/modals/VersionModal";
import { useColors, useThemeMode } from "../active/hooks/useTheme";

export default function SettingsScreen() {
  const t = useTranslation();
  const colors = useColors();
  const { mode } = useThemeMode();
  const { show, hide } = useOverlay();
  const { username, email, allowBotMatch, isAnonymous, country } = useProfile();
  const {
    loading,
    isDisabled,
    isMatching,
    handleToggleBotMatch,
    onLogout,
    handleConfirmDelete,
    lang,
    isSoundEnabled,
    setIsSoundEnabled,
    isSoundEnabledLoaded,
  } = useSettingsScreen();

  useEffect(() => {
    // ⚠️⚠️⚠️謎のエラーを防ぐための部分なので消さない。これがないとBlocked aria-hidden...とか言われる
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="w-full max-w-160 mx-auto px-5 pb-10">
          <View className="mt-2 h-11 justify-center">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/ProfileScreen");
                }
              }}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={36} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <AppText className="text-3xl text-text tracking-wider mb-5">
            {t("common.settings")}
          </AppText>

          <SettingsSection title={t("Settings.accountInfo")}>
            <SettingsRow
              label={t("common.email")}
              onPress={() =>
                show(
                  email ? (
                    <EmailChangeModal visible={true} onClose={hide} />
                  ) : (
                    <LoginModal visible={true} onClose={hide} />
                  ),
                )
              }
              rightElement={
                <AppText className="text-lg text-textSub tracking-wide">
                  {email ? email : t("Settings.notSet")}
                </AppText>
              }
            />
            {/* <SettingsRow
              label={t("common.country")}
              onPress={() =>
                show(
                  <CountryModal
                    onSelectCountry={updateCountry}
                    onClose={hide}
                  />,
                )
              }
              rightElement={
                <AppText className="text-lg text-textSub tracking-wide">
                  {country ? getCountryLabel(country) : t("Settings.notSet")}
                </AppText>
              }
            /> */}
          </SettingsSection>

          {/* 対局セクション */}
          <SettingsSection title={t("Settings.matchSettings")}>
            <SettingsRow
              label={t("Settings.allowBotMatch")}
              rightElement={
                <ToggleSwitch
                  value={allowBotMatch ?? true}
                  onToggle={handleToggleBotMatch}
                  disabled={isMatching}
                  backgroundOnColor={colors.primary}
                  backgroundOffColor={colors.backgroundDark}
                  toggleColor={colors.foreground}
                />
              }
            />
            <SettingsRow
              label={t("Settings.doubleTap")}
              onPress={() =>
                show(<DoubleTapModal isMatching={isMatching} onClose={hide} />)
              }
            />
          </SettingsSection>

          {/* デバイスセクション */}
          <SettingsSection title={t("common.device")}>
            <SettingsRow
              label={t("common.sound")}
              rightElement={
                isSoundEnabledLoaded ? (
                  <ToggleSwitch
                    value={isSoundEnabled}
                    onToggle={(val) => setIsSoundEnabled(val)}
                    backgroundOnColor={colors.primary}
                    backgroundOffColor={colors.backgroundDark}
                    toggleColor={colors.foreground}
                  />
                ) : null
              }
            />

            <SettingsRow
              label={t("common.language")}
              onPress={() => {
                show(<LanguageModal onClose={hide} />);
              }}
              rightElement={
                <AppText className="text-lg text-textSub tracking-wide">
                  {t(`language.${lang}`)}
                </AppText>
              }
            />

            {/* <SettingsRow
              label={t("theme.theme")}
              onPress={() => show(<ThemeModal onClose={hide} />)}
              rightElement={
                <AppText className="text-lg text-textSub tracking-wide">
                  {t(`theme.${mode}`)}
                </AppText>
              }
            /> */}
          </SettingsSection>

          {/* 情報セクション */}
          <SettingsSection title={t("common.information")}>
            <SettingsRow
              label={t("Settings.privacyPolicy")}
              onPress={() => openURL("https://mokuyoubi.org/privacy")}
            />
            <SettingsRow
              label={t("Settings.termsOfService")}
              onPress={() => openURL("https://mokuyoubi.org/terms")}
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
                  isDisabled ? "border-backgroundDark" : "border-primaryDark"
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
                <AppText
                  className={`text-lg ${
                    isDisabled ? "text-backgroundDark" : "text-primaryDark"
                  } tracking-wide`}
                >
                  {t("common.logout")}
                </AppText>
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
              <AppText
                className={`text-lg ${
                  isDisabled ? "text-failureLight" : "text-failure"
                } tracking-wide`}
              >
                {t("Settings.deleteAccount")}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
