import { useTranslation } from "@/src/active/language/i18n";
import { ModalShell } from "modal-shell";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";

type Props = {
  visible?: boolean;
  text?: string;
};

export default function LoadingModal({ visible = true, text }: Props) {
  const t = useTranslation();

  if (!visible) return null;

  return (
    <ModalShell size="sm">
      <View className="w-[200px] h-[140px] justify-center items-center self-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[15px] font-bold text-center text-text tracking-[0.5px]">
          {text || t("common.loading")}
        </Text>
      </View>
    </ModalShell>
  );
}
