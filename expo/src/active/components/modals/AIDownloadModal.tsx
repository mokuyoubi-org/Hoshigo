// AIDownloadModal.tsx
//
// 「b18が使える状態でないのに、b18が必要な操作をしようとした」時に出すガードモーダル。
//  getModelStatus("b18")のフェーズに応じて中身を出し分ける:
//   not_downloaded → ダウンロード確認(はい/いいえ)
//   downloading    → ダウンロード進捗(%)
//   warming_up     → 準備中(不確定バー)
// ウォームアップが完了(ready)したら自動で閉じる。

import { useTranslation } from "@/src/active/i18n/LangProvider";
import { useKataGoEngine } from "expo-katago";
import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { DotAnimation, ModalShell, ProgressBar } from "ui-atoms";

import { useOverlay } from "../../contexts/OverlayContext";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

type Props = {
  // どこから呼ばれたか。not_downloaded時の文言の出し分けにだけ使う。
  from: "matching" | "practice";
};

export const AIDownloadModal = ({ from }: Props) => {
  const t = useTranslation();
  const { hide } = useOverlay();
  const { getModelStatus, downloadB18 } = useKataGoEngine();
  const status = getModelStatus("b18");

  // readyになった瞬間に自動で閉じる。
  useEffect(() => {
    if (status.phase === "ready") {
      hide();
    }
  }, [status.phase, hide]);

  // readyになった直後、useEffectが走ってhide()が反映されるまでの一瞬、
  // 下の分岐(not_downloaded用の確認UI)がチラ見えしないようにする。
  if (status.phase === "ready") {
    return null;
  }

  // ここに来るのは not_downloaded のみ。
  const handleConfirm = () => {
    // 呼びっぱなしでよい(完了を待つ必要はない)。このモーダル自身が
    // getModelStatusを購読してるので、状態が変わり次第自動で表示が
    // 切り替わる(→downloading分岐へ)。
    downloadB18();
  };

  // 進捗表示（downloading / warming_up）の判定と値の準備
  const isProgress =
    status.phase === "downloading" || status.phase === "warming_up";
  const percent =
    status.phase === "downloading" && status.total > 0
      ? Math.floor((status.loaded / status.total) * 100)
      : null;
  const colors = useColors();
  return (
    <ModalShell
      onClose={hide}
      size={"md"}
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      {isProgress ? (
        <View className="w-full items-center gap-4">
          <AppText className="text-sm text-text text-center">
            <DotAnimation
              text={t(
                status.phase === "downloading"
                  ? "AI.downloading"
                  : "AI.warming_up",
              )}
            />
          </AppText>

          <View className="w-56">
            <ProgressBar
              percent={percent}
              trackColor={colors.backgroundStrong}
              fillColor={colors.primary}
            />
          </View>

          <AppText className="text-sm text-textSub text-center">
            {t("common.pleaseWait")}
          </AppText>

          <TouchableOpacity
            className="w-full h-12 rounded-xl justify-center items-center bg-backgroundStrong mt-2"
            onPress={hide}
            activeOpacity={0.8}
          >
            <AppText className="text-textSub text-sm">
              {t("common.close")}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View className="w-full flex-row justify-between items-center mb-3">
            <AppText className="text-lg flex-1 text-text text-center">
              {from === "matching"
                ? t("AI.download_required_match")
                : t("AI.download_required_practice")}
            </AppText>
          </View>

          <View className="w-full gap-2 mt-2">
            <TouchableOpacity
              className="w-full h-12 rounded-xl justify-center items-center bg-blackStone"
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <AppText className="text-foreground text-xl">
                {t("common.yes")}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full h-12 rounded-xl justify-center items-center bg-backgroundStrong"
              onPress={hide}
              activeOpacity={0.8}
            >
              <AppText className="text-textSub text-xl">
                {t("common.no")}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ModalShell>
  );
};
