import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/i18n";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ModalShell } from "ui-atoms";

type Props = {
  visible?: boolean;
};

export default function LoadingModal({ visible = true }: Props) {
  const t = useTranslation();

  if (!visible) return null;

  return (
    <ModalShell size="sm">
      <View className="w-[200px] h-[140px] justify-center items-center self-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[15px] font-bold text-center text-text tracking-[0.5px]">
          {t("common.loading")} ...
        </Text>
      </View>
    </ModalShell>
  );
}
