import { OTA_VERSION } from "@/ota-version";
import { useTranslation } from "@/src/active/i18n";
import * as Application from "expo-application";
import Constants from "expo-constants";
import React from "react";
import { Text, View } from "react-native";
import { ModalShell } from "ui-atoms";

type Props = {
  onClose: () => void;
};

export function VersionModal({ onClose }: Props) {
  const t = useTranslation();
  const appVersion =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version;

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      style={{ alignItems: "center", gap: 16 }}
    >
      <Text className="text-xl font-bold color-text text-center pb-4">
        {t("common.version")}
      </Text>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {/* アプリ本体のバージョン */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("common.appVersion")}
          </Text>
          <Text className="text-lg font-semibold text-textSub">
            {appVersion}
          </Text>
        </View>

        <View className="h-[1px] bg-backgroundDark w-full" />

        {/* OTAバージョン */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
          <Text className="text-lg font-semibold text-text">
            {t("common.otaVersion")}
          </Text>
          <Text className="text-lg font-semibold text-textSub">
            {OTA_VERSION}
          </Text>
        </View>
      </View>
    </ModalShell>
  );
}