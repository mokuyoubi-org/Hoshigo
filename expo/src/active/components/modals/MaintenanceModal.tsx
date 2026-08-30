// MaintenanceModal.tsx
import { useTranslation } from "@/src/active/language/i18n";
import { ModalShell } from "modal-shell";
import React from "react";
import { Text, View } from "react-native";

export function MaintenanceModal({ message }: { message: string | null }) {
  const t = useTranslation();
  const hasMessage = message && message.trim() !== "";
  return (
    <ModalShell size="md" style={{ alignItems: "center", gap: 12 }}>
      <Text className="text-[16px] color-text text-center leading-[22px]">
        {t("MaintenanceModal.defaultMessage")}
      </Text>
      {hasMessage && (
        <View className="bg-foreground rounded-[12px] mt-2 p-4 w-full border-2 border-backgroundDark">
          <Text className="text-[14px] color-text text-center leading-[20px]">
            {message}
          </Text>
        </View>
      )}
    </ModalShell>
  );
}
