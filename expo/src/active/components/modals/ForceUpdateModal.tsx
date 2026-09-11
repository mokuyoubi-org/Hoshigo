// ForceUpdateModal.tsx
import { ModalShell } from "@/packages/ui-atoms/src/ModalShell";
import { useTranslation } from "@/src/active/i18n";
import React from "react";
import { Linking, Platform, Pressable, Text } from "react-native";

export function ForceUpdateModal() {
  const t = useTranslation();

  const handlePress = () => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/id0000000000" // ⚠️⚠️⚠️⚠️⚠️⚠️これはapp storeに公開した時に直すことを忘れずに！⚠️⚠️⚠️⚠️⚠️⚠️
        : "https://play.google.com/store/apps/details?id=com.mokuyoubi.Hoshigo";
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
