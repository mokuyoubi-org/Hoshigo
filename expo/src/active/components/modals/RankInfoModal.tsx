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
import { RankGauge } from "../RankGauge";

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
      borderColor={colors.backgroundStrong}
    >
      {/* 📌【固定①】ヘッダー */}
      <View className="w-full flex-row justify-between items-center mb-4">
        <AppText className="text-xl tracking-wide text-text">
          {t("RankInfoModal.allRank")}
        </AppText>
      </View>

      <ScrollView
        className="w-full rounded-3xl bg-foreground border-2 border-backgroundStrong"
        style={{ height: windowHeight * 0.6 }}
        showsVerticalScrollIndicator
      >
        {colorBundles.map((bundle) => {
          const bundleColor =
            colors[bundle.color as keyof typeof colors] || colors.text;

          const tierCount = bundle.indices.length;
          const rankItems = bundle.indices.map((i) => RANKS[i]);

          const bundleStart = rankItems[0]?.minRating ?? 0;
          const nextRank = RANKS[bundle.indices[bundle.indices.length - 1] + 1];
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
                <RankGauge
                  progress={fillFraction * 100}
                  color={bundleColor}
                  trackColor={`${bundleColor}44`}
                  height={32}
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
    </ModalShell>
  );
}
