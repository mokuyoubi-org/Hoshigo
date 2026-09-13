// UpdateModal.tsx
import { useTranslation } from "@/src/active/i18n";
import * as Updates from "expo-updates";
import React from "react";
import { Linking, Platform, Pressable, Text } from "react-native";
import { ModalShell } from "ui-atoms";

export type UpdateModalKind = "reload" | "store" | "restart";

export function UpdateModal({ kind }: { kind: UpdateModalKind }) {
  const t = useTranslation();

  const handlePress = async () => {
    if (kind === "reload") {
      // web: リロードするだけで最新のJS/HTMLが再取得される
      if (typeof window !== "undefined") window.location.reload();
      return;
    }
    if (kind === "restart") {
      // native: 既にダウンロード済みのOTAバンドルを適用して再起動する
      try {
        await Updates.reloadAsync();
      } catch {
        // 開発ビルドなど、Updatesランタイムが無い環境向けの保険
      }
      return;
    }
    // native: ストアの更新ページを開く
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/id0000000000" // ⚠️⚠️⚠️⚠️⚠️⚠️これはapp storeに公開した時に直すことを忘れずに！⚠️⚠️⚠️⚠️⚠️⚠️
        : "https://play.google.com/store/apps/details?id=com.mokuyoubi.Hoshigo";
    Linking.openURL(url);
  };

  const messageKey =
    kind === "reload"
      ? "UpdateModal.reloadMessage"
      : kind === "restart"
        ? "UpdateModal.restartMessage"
        : "UpdateModal.message";

  const buttonKey =
    kind === "reload"
      ? "UpdateModal.reloadButton"
      : kind === "restart"
        ? "UpdateModal.restartButton"
        : "UpdateModal.updateButton";

  return (
    <ModalShell size="md" style={{ alignItems: "center", gap: 12 }}>
      <Text className="text-[16px] color-text text-center leading-[22px]">
        {t(messageKey)}
      </Text>
      <Pressable
        onPress={handlePress}
        className="bg-foreground rounded-[12px] mt-2 px-6 py-3 border-2 border-backgroundDark"
      >
        <Text className="text-[14px] color-text text-center leading-[20px]">
          {t(buttonKey)}
        </Text>
      </Pressable>
    </ModalShell>
  );
}
