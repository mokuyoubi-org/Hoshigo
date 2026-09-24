// AIDownloadModal.tsx
//
// 「b18が使える状態でないのに、b18が必要な操作をしようとした」時に出すガードモーダル。
//  getModelStatus("b18")のフェーズに応じて中身を出し分ける:
//   not_downloaded → ダウンロード確認(はい/いいえ)
//   downloading    → ダウンロード進捗(%)
//   warming_up     → 準備中(不確定バー)
// ウォームアップが完了(ready)したら自動で閉じる。

import { useTranslation } from "@/src/active/i18n";
import { useKataGoEngine } from "expo-katago";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ModalShell, ProgressBar } from "ui-atoms";
import { COLORS } from "../../constants/colors";
import { useOverlay } from "../../contexts/OverlayContext";

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

  const renderProgress = (message: string, percent: number | null) => (
    <ModalShell
      onClose={hide}
      size="md"
    >

         <View className="w-full items-center gap-4">
      <Text className="text-[18px] font-bold text-text text-center">
        {message}
      </Text>

   
        <View className="w-[220px]">
          <ProgressBar
            percent={percent}
            trackColor={COLORS.backgroundDark}
            fillColor={COLORS.primary}
          />
        </View>

        <Text className="text-sm text-textSub text-center">
          {t("common.pleaseWait")}
        </Text>


      <TouchableOpacity
        className="w-full h-[48px] rounded-[12px] justify-center items-center bg-backgroundDark mt-2"
        onPress={hide}
        activeOpacity={0.8}
      >
        <Text className="text-textSub text-[16px] font-bold">
          {t("common.close")}
        </Text>
      </TouchableOpacity>

            </View>
    </ModalShell>
  );

  if (status.phase === "downloading") {
    const percent =
      status.total > 0
        ? Math.floor((status.loaded / status.total) * 100)
        : null;
    return renderProgress(t("AI.downloading"), percent);
  }

  if (status.phase === "warming_up") {
    return renderProgress(t("AI.warming_up"), null);
  }

  // ここに来るのは not_downloaded のみ。
  const handleConfirm = () => {
    // 呼びっぱなしでよい(完了を待つ必要はない)。このモーダル自身が
    // getModelStatusを購読してるので、状態が変わり次第自動で表示が
    // 切り替わる(→downloading分岐へ)。
    downloadB18();
  };

  const message =
    from === "matching"
      ? t("AI.download_required_match")
      : t("AI.download_required_practice");

  return (
    <ModalShell onClose={hide} size="lg">
      <View className="w-full flex-row justify-between items-center mb-3">
        <Text className="text-[18px] font-bold flex-1 text-text text-center">
          {message}
        </Text>
      </View>

      <View className="w-full gap-[10px] mt-2">
        <TouchableOpacity
          className="w-full h-[48px] rounded-[12px] justify-center items-center bg-primaryDark"
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Text className="text-foreground text-[16px] font-bold">
            {t("common.yes")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full h-[48px] rounded-[12px] justify-center items-center bg-backgroundDark"
          onPress={hide}
          activeOpacity={0.8}
        >
          <Text className="text-textSub text-[16px] font-bold">
            {t("common.no")}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};
