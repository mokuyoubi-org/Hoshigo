// ✅active
// RankCard.tsx
// プロフィール画面のランク表示カードコンポーネント

import { RankProgressBar } from "@/src/active/components/common/RankProgressBar";
import { COLORS } from "@/src/active/constants/colors";
import { useLang, useTranslation } from "@/src/active/language/i18n";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { RankInfo } from "../../constants/ranks";

interface RankCardProps {
  rankInfo: RankInfo;
  onOpenInfo: () => void;
}

export function RankCard({ rankInfo, onOpenInfo }: RankCardProps) {
  const t = useTranslation();
  const { lang } = useLang();

  // COLORS 定数から色を取得（見つからない場合はフォールバック）
  const textColor =
    COLORS[rankInfo.color as keyof typeof COLORS] || COLORS.text;

  const winsNeeded = rankInfo.next?.winsNeeded ?? 0;
  const winText = lang === "en" ? (winsNeeded === 1 ? "win" : "wins") : "";

  return (
    <View className="bg-foreground rounded-3xl border-2 border-backgroundDark p-7 items-center">
      {/* YOUR RANK & インフォボタン */}
      <View className="flex-row items-center gap-1.5">
        <Text className="text-[11px] text-text tracking-[2px] font-bold">
          {t("Profile.youAre")}
        </Text>
        <TouchableOpacity
          onPress={onOpenInfo}
          activeOpacity={0.6}
          className="p-0.5"
        >
          <MaterialIcons name="info-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ランク名（翻訳済みの name が届いてる） */}
      <Text
        className="text-[40px] font-extrabold tracking-wide my-2.5"
        style={{ color: textColor }}
      >
        {rankInfo.name}
      </Text>

      {/* ゲージ＆昇級情報 */}
      <View className="w-full">
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-text font-semibold opacity-70">
            {rankInfo.next ? `${rankInfo.next.name} ▶︎` : "MAX RANK"}
          </Text>
          <Text className="text-xs font-bold" style={{ color: textColor }}>
            {rankInfo.next
              ? t("Profile.remaining", {
                  wins: winsNeeded,
                  winText: winText,
                })
              : "COMPLETE!"}
          </Text>
        </View>

        <RankProgressBar
          progressPercent={rankInfo.percent}
          color={textColor}
          animationType="simple"
        />
      </View>
    </View>
  );
}
