// RankCard.tsx
// プロフィール画面のランク表示カードコンポーネント

import { MyText } from "@/src/components/common/MyText";
import { RankGauge } from "@/src/components/rank/RankGauge";
import { RankInfo } from "@/src/constants/ranks";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Animated, TouchableOpacity, View } from "react-native";

type Props = {
  rankInfo: RankInfo;
  onOpenInfo: () => void;
};

const useAnimatedPercent = (target: number, duration = 1000) => {
  // 🐱 RankProgressBar の "simple" と同じく、0 から始める
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(Math.max(target, 0), 100),
      duration,
      useNativeDriver: false, // 🐱 width / left(%) を動かすので常に false
    }).start();
  }, [target, duration, anim]);

  return anim;
};

export const RankCard = ({ rankInfo, onOpenInfo }: Props) => {
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
        <MyText className="text-sm text-text uppercase">
          {t("Profile.youAre")}
        </MyText>
        <MaterialIcons name="info-outline" size={18} color={colors.primary} />
      </View>

      {/* ランク名（翻訳済みの name が届いてる） */}
      <MyText
        className="text-4xl tracking-wide my-2"
        style={{ color: textColor }}
      >
        {rankInfo.name}
      </MyText>

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
};
