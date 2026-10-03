// RankCard.tsx
// プロフィール画面のランク表示カードコンポーネント

import { RankGauge } from "@/src/active/components/RankGauge";
import { useAnimatedPercent } from "@/src/active/hooks/useAnimatedPercent";

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

  // 🐱 0 から現在地点まで 1000ms で伸びる（ゲージと吹き出しが同じ値を使う）
  const progress = useAnimatedPercent(rankInfo.percent);

  // 🐱 あと何点か（最高ランクのときは次がないので出さない）
  const footerText = rankInfo.next
    ? t("RankInfoModal.remaining", {
        nextRank: rankInfo.next.name,
        rating: rankInfo.next.ratingNeeded,
      })
    : null;

  return (
    <TouchableOpacity
      onPress={onOpenInfo}
      activeOpacity={0.8}
      className="bg-foreground rounded-3xl border-2 border-backgroundStrong p-6 items-center"
    >
      {/* YOUR RANK & インフォアイコン */}
      <View className="flex-row items-center gap-2">
        <AppText className="text-sm text-text uppercase">
          {t("Profile.youAre")}
        </AppText>
        <MaterialIcons name="info-outline" size={18} color={colors.primary} />
      </View>

      {/* ランク名（翻訳済みの name が届いてる） */}
      <AppText
        className="text-4xl tracking-wide my-2"
        style={{ color: textColor }}
      >
        {rankInfo.name}
      </AppText>

      {/* ゲージ（吹き出し + ゲージ + あと◯） */}
      <RankGauge
        progress={progress}
        color={textColor}
        bubbleText={rankInfo.rating}
        footerText={footerText}
        height={32}
      />
    </TouchableOpacity>
  );
}
