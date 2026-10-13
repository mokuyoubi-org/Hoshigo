// UpdateModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import * as Updates from "expo-updates";
import { Linking, Platform, Pressable } from "react-native";
import { ModalShell } from "ui-atoms";

export type UpdateModalKind = "reload" | "store" | "restart";

export const UpdateModal = ({ kind }: { kind: UpdateModalKind }) => {
  const t = useTranslation();
  const colors = useColors();
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
    <ModalShell
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <MyText className="text-base color-text text-center">
        {t(messageKey)}
      </MyText>
      <Pressable
        onPress={handlePress}
        className="bg-foreground rounded-xl mt-4 px-6 py-3 border-2 border-backgroundStrong"
      >
        <MyText className="text-base color-text text-center">
          {t(buttonKey)}
        </MyText>
      </Pressable>
    </ModalShell>
  );
};
