// RankInfoModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
import { ModalShell } from "modal-shell";
import React, { useMemo } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { RankInfo, RANKS } from "../../constants/ranks";
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
  const t = useTranslation();

  // 🐱 端末の高さを取得する
  const { height: windowHeight } = useWindowDimensions();

  // 🐱 親から届いた rankInfo からポイントを取得する
  const rating = rankInfo.rating;

  const colorBundles = useMemo(() => buildColorBundles(), []);

  if (!visible) return null;

  return (
    <ModalShell onClose={onClose} size="lg">
      {/* 📌【固定①】ヘッダー */}
      <View className="w-full flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold tracking-wide text-text">
          {t("RankInfoModal.title")}
        </Text>
      </View>

      {/* 📌【固定②】現在のくみ */}
      <View className="w-full rounded-[20px] p-[22px] items-center mb-4 bg-foreground border-[1.5px] border-background">
        <Text className="text-xs font-bold mb-2.5 tracking-widest text-textSub">
          {t("RankInfoModal.yourCurrentRating")}
        </Text>
        <Text
          className="text-[34px] font-extrabold mb-1.5"
          style={{
            color: COLORS[rankInfo.color as keyof typeof COLORS] || COLORS.text,
          }}
        >
          {rating}
        </Text>

        {rankInfo.next && (
          <Text className="text-sm font-semibold text-textSub">
            {t("RankInfoModal.remaining", {
              nextRank: rankInfo.next.name,
              rating: rankInfo.next.ratingNeeded,
            })}
          </Text>
        )}
      </View>

      {/* 🌀【割合高さスクロール】端末高さの 30%（0.3）をセットした */}
      <View className="w-full mb-3">
        <Text className="text-xs font-bold tracking-wider mb-2.5 text-textSub">
          {t("RankInfoModal.allRank")}
        </Text>

        <ScrollView
          className="w-full"
          style={{ height: windowHeight * 0.35 }}
          showsVerticalScrollIndicator
        >
          {colorBundles.map((bundle) => {
            const bundleColor =
              COLORS[bundle.color as keyof typeof COLORS] || COLORS.text;

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
                className="mb-4 rounded-3xl px-4 py-4 bg-foreground w-full"
              >
                <View className="w-full h-7 rounded-xl overflow-hidden mb-2 relative">
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
                        <Text
                          className="text-xs font-black tracking-wider"
                          style={{
                            color: bundleColor,
                          }}
                        >
                          {t(rank.nameKey)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row absolute inset-0 pointer-events-none">
                    {Array.from({ length: tierCount - 1 }).map((_, i) => (
                      <View
                        key={i}
                        className="absolute h-full w-[1.5px] bg-background"
                        style={{
                          left: `${((i + 1) / tierCount) * 100}%`,
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View className="flex-row justify-between">
                  {boundaryRating.map((p, i) => (
                    <Text
                      key={i}
                      className="text-[11px] font-semibold text-textSub"
                    >
                      {p !== null ? `${p}pt` : "-"}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 📌【固定③】フッター説明カード */}
      <View className="p-[18px] rounded-3xl bg-foreground border-[1.5px] border-background w-full">
        <Text className="text-[13px] font-semibold leading-5 text-textSub">
          {t("RankInfoModal.infoText")}
        </Text>
      </View>
    </ModalShell>
  );
}
