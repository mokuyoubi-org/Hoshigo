// ForceUpdateModal.tsx
import { useTranslation } from "@/src/active/language/i18n";
import { ModalShell } from "modal-shell";
import React from "react";
import { Linking, Platform, Pressable, Text } from "react-native";

export function ForceUpdateModal() {
  const t = useTranslation();

  const handlePress = () => {
    const url =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_APP_STORE_URL!
        : process.env.EXPO_PUBLIC_PLAY_STORE_URL!;
    Linking.openURL(url);
  };

  return (
    <ModalShell size="md" style={{ alignItems: "center", gap: 12 }}>
      <Text className="text-[16px] color-text text-center leading-[22px]">
        {t("ForceUpdateModal.message")}
      </Text>
      <Pressable
        onPress={handlePress}
        className="bg-foreground rounded-[12px] mt-2 px-6 py-3 border-2 border-backgroundDark"
      >
        <Text className="text-[14px] color-text text-center leading-[20px]">
          {t("ForceUpdateModal.updateButton")}
        </Text>
      </Pressable>
    </ModalShell>
  );
}