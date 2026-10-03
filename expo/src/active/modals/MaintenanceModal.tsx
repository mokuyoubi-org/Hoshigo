// MaintenanceModal.tsx
import { useTranslation } from "@/src/active/i18n/LangProvider";
import React from "react";
import { View } from "react-native";
import { ModalShell } from "ui-atoms";
import { AppText } from "../components/common/AppText";
import { useColors } from "../hooks/useTheme";



export function MaintenanceModal({ message }: { message: string | null }) {
  const t = useTranslation();
  const colors = useColors();
  const hasMessage = message && message.trim() !== "";
  return (
    <ModalShell
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <AppText className="text-base color-text text-center">
        {t("MaintenanceModal.defaultMessage")}
      </AppText>
      {hasMessage && (
        <View className="bg-foreground rounded-xl mt-4 p-4 w-full border-2 border-backgroundStrong">
          <AppText className="text-base color-text text-center">
            {message}
          </AppText>
        </View>
      )}
    </ModalShell>
  );
}
