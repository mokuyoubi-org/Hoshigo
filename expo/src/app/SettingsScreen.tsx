import { DeleteModal } from "@/src/active/components/modals/DeleteModal";
import { LogoutModal } from "@/src/active/components/modals/LogoutModal";
import { COLORS } from "@/src/active/constants/colors";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useSettingsScreen } from "@/src/active/hooks/screens/useSettingsScreen";
import { useTranslation } from "@/src/active/i18n";
import { openURL } from "@/src/stable/logics/linking";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKVStorage } from "storage-kit";
import { ToggleSwitch } from "ui-atoms";
import { SettingsRow } from "../active/components/common/SettingsRow";
import { SettingsSection } from "../active/components/common/SettingsSection";
import { AIModelModal } from "../active/components/modals/AIModelModal";
import { CountryModal } from "../active/components/modals/CountryModal";
import { DoubleTapModal } from "../active/components/modals/DoubleTapModal";
import { EmailChangeModal } from "../active/components/modals/EmailChangeModal";
import { LoginModal } from "../active/components/modals/LoginModal";
import { VersionModal } from "../active/components/modals/VersionModal";
import { useCountryUpdate } from "../active/hooks/useCountryUpdate";
import { getCountryLabel } from "../stable/logics/country";

export default function SettingsScreen() {
  const t = useTranslation();
  const { show, hide } = useOverlay();
  const { username, email, allowBotMatch, isAnonymous, country } = useProfile();
  const {
    loading,
    isDisabled,
    isMatching,
    handleToggleBotMatch,
    onLogout,
    handleConfirmDelete,
  } = useSettingsScreen();
  const { updateCountry } = useCountryUpdate();

  const {
    value: isSoundEnabled,
    setValue: setIsSoundEnabled,
    isLoaded: isSoundEnabledLoaded,
  } = useKVStorage<boolean>("global.sound", true);

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
        <View className="w-full max-w-[680px] mx-auto px-5 pb-10">
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
              <Ionicons
                name="chevron-back-outline"
                size={32}
                color={COLORS.primaryDark}
              />
            </TouchableOpacity>
          </View>

          <Text className="text-3xl font-extrabold text-text tracking-wider mb-5">
            {t("common.settings")}
          </Text>

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
                <Text className="text-lg font-semibold text-textSub tracking-wide">
                  {email ? email : "Not set"}
                </Text>
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
                <Text className="text-lg font-semibold text-textSub tracking-wide">
                  {country ? getCountryLabel(country) : t("Settings.notSet")}
                </Text>
              }
            /> */}
          </SettingsSection>

          <SettingsSection title={t("Settings.matchSettings")}>
            <SettingsRow
              label={t("Settings.allowBotMatch")}
              rightElement={
                <ToggleSwitch
                  value={allowBotMatch ?? true}
                  onToggle={handleToggleBotMatch}
                  disabled={isMatching}
                  backgroundColor={COLORS.primary}
                  toggleColor={COLORS.foreground}
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

          <SettingsSection title={t("common.device")}>
            <SettingsRow
              label={t("common.sound")}
              rightElement={
                isSoundEnabledLoaded ? (
                  <ToggleSwitch
                    value={isSoundEnabled}
                    onToggle={(val) => setIsSoundEnabled(val)}
                    backgroundColor={COLORS.primary}
                    toggleColor={COLORS.foreground}
                  />
                ) : null
              }
            />
            <SettingsRow
              label={t("common.aiModels")}
              onPress={() => show(<AIModelModal onClose={hide} />)}
            />
          </SettingsSection>

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
                className={`h-[52px] w-full rounded-xl justify-center items-center bg-foreground border-2 border-backgroundDark ${
                  isDisabled ? "opacity-40" : ""
                }`}
                disabled={loading}
                activeOpacity={0.8}
                onPress={() => {
                  show(
                    <LogoutModal
                      title={t("LogoutModal.title")}
                      confirmText={t("common.logout")}
                      onConfirm={async () => {
                        await onLogout();
                        hide();
                      }}
                      onCancel={hide}
                    />,
                  );
                }}
              >
                <Text className="text-lg font-bold text-text tracking-wide">
                  {t("common.logout")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className={`h-[52px] w-full rounded-xl justify-center items-center bg-foreground border-2 border-coral ${
                isDisabled ? "opacity-40" : ""
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
              <Text className="text-lg font-bold text-coral tracking-wide">
                {t("Settings.deleteAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
