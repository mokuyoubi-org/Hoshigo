// RankCard.tsx
// プロフィール画面のランク表示カードコンポーネント

import { RankProgressBar } from "@/src/active/components/common/RankProgressBar";

import { RankInfo } from "@/src/active/constants/ranks";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

type Props = {
  rankInfo: RankInfo;
  onOpenInfo: () => void;
};

export function RankCard({ rankInfo, onOpenInfo }: Props) {
  const t = useTranslation();
  const colors = useColors();
  // colors 定数から色を取得（見つからない場合はフォールバック）
  const textColor =
    colors[rankInfo.color as keyof typeof colors] || colors.text;

  return (
    <TouchableOpacity
      onPress={onOpenInfo}
      activeOpacity={0.8}
      className="bg-foreground rounded-3xl border-2 border-backgroundDark p-7 items-center"
    >
      {/* YOUR RANK & インフォアイコン */}
      <View className="flex-row items-center gap-1.5">
        <AppText className="text-sm text-text uppercase">
          {t("Profile.youAre")}
        </AppText>
        <MaterialIcons name="info-outline" size={18} color={colors.primary} />
      </View>

      {/* ランク名（翻訳済みの name が届いてる） */}
      <AppText
        className="text-4xl tracking-wide my-2.5"
        style={{ color: textColor }}
      >
        {rankInfo.name}
      </AppText>

      {/* ゲージ＆昇級情報 */}
      <RankProgressBar
        progressPercent={rankInfo.percent}
        color={textColor}
        animationType="simple"
      />
    </TouchableOpacity>
  );
}
