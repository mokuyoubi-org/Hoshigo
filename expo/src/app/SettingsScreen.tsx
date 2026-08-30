import { DeleteModal } from "@/src/active/components/modals/DeleteModal";
import { LogoutModal } from "@/src/active/components/modals/LogoutModal";
import { useTranslation } from "@/src/active/language/i18n";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOverlay } from "react-overlay";
import { ToggleSwitch } from "ui-atoms";
import { useProfile } from "../active/contexts/ProfileContexts";
import { useDoubleTapSetting } from "../active/hooks/others/useDoubleTapSetting";
import { useSettingsScreen } from "../active/hooks/others/useSettingsScreen";
import { openURL } from "../stable/logics/linking";

export default function Settings() {
  const t = useTranslation();
  const { show, hide } = useOverlay();
  const { username, email, allowBotMatch, isAnonymous } = useProfile();
  const {
    loading,
    isDisabled,
    isMatching,
    handleToggleBotMatch,
    onLogout,
    handleConfirmDelete,
  } = useSettingsScreen();

  // 🐱 ダブルタップ設定用フックの呼び出し
  const { enableDoubleTap13, toggleDoubleTap13 } = useDoubleTapSetting();

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
              onPress={() => router.push("/(tabs)/ProfileScreen")}
              activeOpacity={0.7}
            >
              <Text className="text-base font-bold text-text tracking-wide">
                ‹ {t("common.back")}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-3xl font-extrabold text-text tracking-wider mb-5">
            {t("common.settings")}
          </Text>

          <View className="mb-6">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-text mb-2.5 ml-1">
              {t("Settings.accountInfo")}
            </Text>
            <View className="flex-row justify-between items-center bg-foreground rounded-xl border-2 border-backgroundDark px-[18px] py-4 min-h-[56px] w-full">
              <Text className="text-base font-semibold text-text tracking-wide">
                {t("common.email")}
              </Text>
              <Text className="text-base font-semibold text-textSub tracking-wide">
                {email ? email : "Not set"}
              </Text>
            </View>
          </View>

          {/* 対局設定セクション */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-text mb-2.5 ml-1">
              {t("Settings.matchSettings")}
            </Text>
            <View className="bg-foreground rounded-xl border-2 border-backgroundDark w-full overflow-hidden">
              {/* ボットマッチ許可 */}
              <View className="flex-row justify-between items-center px-[18px] py-4 min-h-[56px]">
                <Text className="text-base font-semibold text-text tracking-wide">
                  {t("Settings.allowBotMatch")}
                </Text>
                <ToggleSwitch
                  value={allowBotMatch ?? true}
                  onToggle={handleToggleBotMatch}
                  disabled={isMatching}
                />
              </View>

              {/* 区切り線 */}
              <View className="h-[1px] bg-backgroundDark w-full" />

              {/* 🐱 ダブルタップ着手設定 */}
              <View className="flex-row justify-between items-center px-[18px] py-4 min-h-[56px]">
                <Text className="text-base font-semibold text-text tracking-wide">
                  {t("Settings.enableDoubleTap", {
                    defaultValue: "ダブルタップで着手",
                  })}
                </Text>
                <ToggleSwitch
                  value={enableDoubleTap13}
                  onToggle={toggleDoubleTap13}
                  disabled={isMatching}
                />
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-text mb-2.5 ml-1">
              {t("Settings.information")}
            </Text>
            <View className="gap-2">
              <TouchableOpacity
                className="flex-row justify-between items-center bg-foreground rounded-xl border-2 border-backgroundDark px-[18px] py-4 min-h-[56px] w-full"
                activeOpacity={0.7}
                onPress={() => openURL("https://mokuyoubi.org/privacy")}
              >
                <Text className="text-base font-semibold text-text tracking-wide">
                  {t("Settings.privacyPolicy")}
                </Text>
                <Text className="text-2xl font-light text-text opacity-50">
                  ›
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row justify-between items-center bg-foreground rounded-xl border-2 border-backgroundDark px-[18px] py-4 min-h-[56px] w-full"
                activeOpacity={0.7}
                onPress={() => openURL("https://mokuyoubi.org/terms")}
              >
                <Text className="text-base font-semibold text-text tracking-wide">
                  {t("Settings.termsOfService")}
                </Text>
                <Text className="text-2xl font-light text-text opacity-50">
                  ›
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="gap-3">
            {/* ログアウトボタン */}
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
                <Text className="text-base font-bold text-text tracking-wide">
                  {t("common.logout")}
                </Text>
              </TouchableOpacity>
            )}

            {/* アカウント削除ボタン */}
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
              <Text className="text-base font-bold text-coral tracking-wide">
                {t("Settings.deleteAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
