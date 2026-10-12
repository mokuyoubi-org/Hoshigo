// VersionModal.tsx

import { OTA_VERSION } from "@/ota-version";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import * as Application from "expo-application";
import Constants from "expo-constants";
import React from "react";
import { View } from "react-native";
import { Divider, ModalShell } from "ui-atoms";

type Props = {
  onClose: () => void;
};

export const VersionModal = ({ onClose }: Props) => {
  const t = useTranslation();
  const colors = useColors();
  const appVersion =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version;

  return (
    <ModalShell
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      onClose={onClose}
      size="md"
    >
      <MyText className="text-xl color-text text-center pb-4">
        {t("common.version")}
      </MyText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {/* アプリ本体のバージョン */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-lg text-text">
            {t("common.appVersion")}
          </MyText>
          <MyText className="text-lg text-textSub">{appVersion}</MyText>
        </View>

        <Divider backgroundColor={colors.backgroundStrong} />

        {/* OTAバージョン */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-lg text-text">
            {t("common.otaVersion")}
          </MyText>
          <MyText className="text-lg text-textSub">{OTA_VERSION}</MyText>
        </View>
      </View>
    </ModalShell>
  );
};
