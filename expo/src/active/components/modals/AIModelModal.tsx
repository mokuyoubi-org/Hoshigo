// AIModelModal.tsx
import { useTranslation } from "@/src/active/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { FontAwesome } from "@expo/vector-icons";
import { ModelStatus, useKataGoEngine } from "expo-katago";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ModalShell, ProgressBar } from "ui-atoms";
import {
  BOT_MODEL_ID,
  BOT_STATS,
  BotUsername,
} from "../../constants/botProfiles";
import { COLORS } from "../../constants/colors";
import { Avatar } from "../common/Avatar";

type Props = {
  onClose: () => void;
};

// ステータスに応じた右側表示。ダウンロード前だけタップ可能(ボタン)、
// それ以外は状態を示すだけ(タップ不可)。
function ModelStatusRight({
  status,
  onDownload,
}: {
  status: ModelStatus;
  onDownload: () => void;
}) {
  const t = useTranslation();
  switch (status.phase) {
    case "ready":
      return (
        <FontAwesome name="check-circle" size={24} color={COLORS.primary} />
      );
    case "downloading": {
      const percent =
        status.total > 0
          ? Math.floor((status.loaded / status.total) * 100)
          : null;
      return (
        <View className="items-end gap-1 w-[80px]">
          <ProgressBar
            percent={percent}
            height={5}
            trackColor={COLORS.backgroundDark}
            fillColor={COLORS.primary}
          />
          <Text className="text-sm text-textSub">
            {percent !== null ? `${percent}%` : `${t("common.downloading")}…`}
          </Text>
        </View>
      );
    }
    case "warming_up":
      return (
        <View className="items-end gap-1 w-[80px]">
          <ProgressBar
            percent={null}
            height={5}
            trackColor={COLORS.backgroundDark}
            fillColor={COLORS.primary}
          />
          <Text className="text-sm text-textSub">
            {" "}
            {t("common.preparing")}…
          </Text>
        </View>
      );
    case "not_downloaded":
      return (
        <TouchableOpacity
          className="h-8 px-3 rounded-full bg-primary justify-center items-center"
          onPress={onDownload}
          activeOpacity={0.8}
        >
          <Text className="text-base font-semibold text-foreground">
            {t("common.download")}
          </Text>
        </TouchableOpacity>
      );
  }
}

export function AIModelModal({ onClose }: Props) {
  const t = useTranslation();
  const { getModelStatus, downloadB18 } = useKataGoEngine();

  // ボットのアバター情報を取得するヘルパー関数
  const getBotAvatarProps = (botName: BotUsername) => {
    const stats = BOT_STATS[botName];
    const rankInfo = getRankInfo(stats.ratingByBoardSize[19] ?? 0, t);
    return {
      rankIndex: rankInfo.index,
      iconIndex: stats.iconIndex,
    };
  };

  const rows: BotUsername[] = ["bot1", "bot2", "bot3"];

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      style={{ alignItems: "center", gap: 16 }}
    >
      <Text className="text-xl font-bold color-text text-center pb-4">
        {t("common.aiModels")}
      </Text>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {rows.map((botName, i) => {
          const modelId = BOT_MODEL_ID[botName];
          const status = getModelStatus(modelId);

          return (
            <React.Fragment key={botName}>
              <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
                <View className="flex-row items-center gap-2">
                  <Avatar {...getBotAvatarProps(botName)} size={40} />
                  <Text className="text-lg font-semibold text-text">
                    {t(`BotName.${botName}`)}
                  </Text>
                </View>
                <ModelStatusRight
                  status={status}
                  onDownload={() => {
                    // 今のところnot_downloadedになり得るのはb18だけ
                    // (b6/b10は起動時に自動でDLされるため)。
                    if (modelId === "b18") downloadB18();
                  }}
                />
              </View>
              {i < rows.length - 1 && (
                <View className="h-[1px] bg-backgroundDark w-full" />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </ModalShell>
  );
}
