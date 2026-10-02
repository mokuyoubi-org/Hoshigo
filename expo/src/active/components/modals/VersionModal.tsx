import { OTA_VERSION } from "@/ota-version";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import * as Application from "expo-application";
import Constants from "expo-constants";
import React from "react";
import { View } from "react-native";
import { ModalShell } from "ui-atoms";

import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { Divider } from "../common/Divider";

type Props = {
  onClose: () => void;
};

export function VersionModal({ onClose }: Props) {
  const t = useTranslation();
  const colors = useColors();
  const appVersion =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version;

  return (
    <ModalShell
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundDark}
      onClose={onClose}
      size="md"
    >
      <AppText className="text-xl color-text text-center pb-4">
        {t("common.version")}
      </AppText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {/* アプリ本体のバージョン */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("common.appVersion")}
          </AppText>
          <AppText className="text-lg text-textSub">{appVersion}</AppText>
        </View>

        <Divider />

        {/* OTAバージョン */}
        <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
          <AppText className="text-lg text-text">
            {t("common.otaVersion")}
          </AppText>
          <AppText className="text-lg text-textSub">{OTA_VERSION}</AppText>
        </View>
      </View>
    </ModalShell>
  );
}
