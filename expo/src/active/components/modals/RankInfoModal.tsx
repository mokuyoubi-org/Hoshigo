// RankInfoModal.tsx

import { RankInfo, RANKS } from "@/src/active/constants/ranks";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import React, { useMemo } from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { RankProgressBar } from "../common/RankProgressBar";

type Props = {
  visible: boolean;
  onClose: () => void;
  rankInfo: RankInfo;
};

const SUB_TIERS_PER_COLOR = 3;

type ColorBundle = {
  color: string;
  startIndex: number;
  indices: number[];
};

function buildColorBundles(): ColorBundle[] {
  const bundles: ColorBundle[] = [];
  for (let i = 0; i < RANKS.length; i += SUB_TIERS_PER_COLOR) {
    const chunk = RANKS.slice(i, i + SUB_TIERS_PER_COLOR);
    if (chunk.length === 0) continue;
    bundles.push({
      color: chunk[0].color,
      startIndex: i,
      indices: chunk.map((_, offset) => i + offset),
    });
  }
  return bundles;
}

export default function RankInfoModal({ visible, onClose, rankInfo }: Props) {
  const colors = useColors();
  const t = useTranslation();

  // 🐱 端末の高さを取得する
  const { height: windowHeight } = useWindowDimensions();

  // 🐱 親から届いた rankInfo からポイントを取得する
  const rating = rankInfo.rating;

  const colorBundles = useMemo(() => buildColorBundles(), []);

  if (!visible) return null;

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundDark}
    >
      {/* 📌【固定①】ヘッダー */}
      <View className="w-full flex-row justify-between items-center mb-4">
        <AppText className="text-xl tracking-wide text-text">
          {t("RankInfoModal.title")}
        </AppText>
      </View>

      {/* 📌【固定②】現在のくみ */}
      <View className="w-full rounded-3xl p-4 items-center mb-4 bg-foreground border-2 border-backgroundDark">
        <AppText
          className="text-4xl m-2"
          style={{
            color: colors[rankInfo.color as keyof typeof colors] || colors.text,
          }}
        >
          {rating}
        </AppText>

        {rankInfo.next && (
          <AppText className="text-sm text-textSub">
            {t("RankInfoModal.remaining", {
              nextRank: rankInfo.next.name,
              rating: rankInfo.next.ratingNeeded,
            })}
          </AppText>
        )}
      </View>

      {/* 🌀【割合高さスクロール】端末高さの 30%（0.3）をセットした */}
      <View className="w-full mb-3">
        <AppText className="text-sm tracking-wider mb-2.5 text-textSub">
          {t("RankInfoModal.allRank")}
        </AppText>

        <ScrollView
          className="w-full rounded-3xl bg-foreground border-2 border-backgroundDark"
          style={{ height: windowHeight * 0.45 }}
          showsVerticalScrollIndicator
        >
          {colorBundles.map((bundle) => {
            const bundleColor =
              colors[bundle.color as keyof typeof colors] || colors.text;

            const tierCount = bundle.indices.length;
            const rankItems = bundle.indices.map((i) => RANKS[i]);

            const bundleStart = rankItems[0]?.minRating ?? 0;
            const nextRank =
              RANKS[bundle.indices[bundle.indices.length - 1] + 1];
            const bundleEnd = nextRank?.minRating ?? null;

            const boundaryRating = [
              ...rankItems.map((g) => g.minRating),
              bundleEnd,
            ];

            const isPastBundle = bundleEnd !== null && rating >= bundleEnd;
            const isFutureBundle = rating < bundleStart;

            let fillFraction = 0;
            if (isPastBundle) {
              fillFraction = 1;
            } else if (isFutureBundle) {
              fillFraction = 0;
            } else {
              const currentSubTierIndex = rankItems.findIndex((rank, idx) => {
                const nextMin = rankItems[idx + 1]?.minRating ?? bundleEnd;
                return nextMin === null || rating < nextMin;
              });

              if (currentSubTierIndex !== -1) {
                const currentSubRank = rankItems[currentSubTierIndex];
                const nextMinRating =
                  rankItems[currentSubTierIndex + 1]?.minRating ?? bundleEnd;

                const tierStart = currentSubRank.minRating;
                const tierEnd = nextMinRating;

                let subTierFraction = 1;
                if (tierEnd !== null && tierEnd > tierStart) {
                  subTierFraction = Math.min(
                    Math.max((rating - tierStart) / (tierEnd - tierStart), 0),
                    1,
                  );
                }

                fillFraction =
                  (currentSubTierIndex + subTierFraction) / tierCount;
              }
            }

            return (
              <TouchableOpacity
                key={bundle.color}
                activeOpacity={1}
                className="px-4 py-4 w-full"
              >
                <View className="w-full h-8 rounded overflow-hidden mb-2 relative">
                  <RankProgressBar
                    progressPercent={fillFraction * 100}
                    color={bundleColor}
                    animationType="none"
                    height={28}
                    style={{ backgroundColor: `${bundleColor}44` }}
                  />

                  <View className="flex-row absolute inset-0 items-center">
                    {rankItems.map((rank, i) => (
                      <View
                        key={i}
                        className="flex-1 items-center justify-center"
                      >
                        <AppText
                          className="text-sm tracking-wider"
                          style={{
                            color: bundleColor,
                          }}
                        >
                          {t(rank.nameKey)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="flex-row justify-between">
                  {boundaryRating.map((p, i) => (
                    <AppText key={i} className="text-sm text-textSub">
                      {p !== null && p}
                    </AppText>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </ModalShell>
  );
}
