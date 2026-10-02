import { useTranslation } from "@/src/active/i18n/LangProvider";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

type Props = {
  visible?: boolean;
};

export default function LoadingModal({ visible = true }: Props) {
  const colors = useColors();
  const t = useTranslation();

  if (!visible) return null;

  return (
    <ModalShell
      size="sm"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View className="w-48 h-36 justify-center items-center self-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText className="mt-4 text-base text-center text-text">
          {t("common.loading")} ...
        </AppText>
      </View>
    </ModalShell>
  );
}
