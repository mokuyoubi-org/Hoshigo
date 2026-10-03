// MatchResultContent.tsx

import {
  FontAwesome,
  MaterialCommunityIcons,
  Octicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { BoardSize } from "go-core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  View,
} from "react-native";

import { ICONS } from "@/src/active/constants/icons";
import { RankInfo, RANKS } from "@/src/active/constants/ranks";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useIconUpdate } from "@/src/active/hooks/useIconUpdate";
import { useColors } from "@/src/active/hooks/useTheme";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { winsToNewlyAcquiredIconIndex } from "@/src/stable/logics/winsToAcquiredIcons";
import { AppImage } from "../../components/common/AppImage";
import { AppText } from "../../components/common/AppText";
import { RankGauge } from "../../components/RankGauge";


type Props = {
  onClose: () => void;
  ratingBefore: number;
  ratingAfter: number;
  rankIndexBefore: number;
  rankIndexAfter: number;
  boardSize: BoardSize;
  giantKillingStreak: number;
  giantKillingBonus: boolean;
};

// 🐱 「いま目指しているゴール」（次のランク名と、そのスタートのレート）
type NextTarget = { name: string; minRating: number } | null;

const toNextTarget = (info: RankInfo): NextTarget =>
  info.next
    ? { name: info.next.name, minRating: RANKS[info.index + 1].minRating }
    : null;

export function MatchResultContent({
  onClose,
  ratingBefore,
  ratingAfter,
  rankIndexBefore,
  rankIndexAfter,
  boardSize,
  giantKillingStreak,
  giantKillingBonus,
}: Props) {
  const colors = useColors();
  const { hide } = useOverlay();
  const { startMatching, isMatching } = useMatching();
  const t = useTranslation();

  const { wins19, wins13, wins9, iconIndex: currentIconIndex } = useProfile();
  const { updateIconIndex } = useIconUpdate();

  // アイコン変更の個別ローディング状態
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const newlyAcquiredIcon = winsToNewlyAcquiredIconIndex(
    wins9 ?? 0,
    wins13 ?? 0,
    wins19 ?? 0,
  );

  const handleSelectIcon = async (iconId: number) => {
    if (loadingIndex !== null || currentIconIndex === iconId) return;
    try {
      setLoadingIndex(iconId);
      await updateIconIndex(iconId);
    } finally {
      setLoadingIndex(null);
    }
  };

  // ゲージのアニメーション設定
  const progressAnim = useMemo(() => new Animated.Value(0), []);

  const hasAnimated = useRef(false);

  const beforeInfo = useMemo(
    () => getRankInfo(ratingBefore, t),
    [ratingBefore, t],
  );
  const afterInfo = useMemo(
    () => getRankInfo(ratingAfter, t),
    [ratingAfter, t],
  );

  const rankColor =
    colors[afterInfo.color as keyof typeof colors] || colors.text;
  const [isRankNew, setIsRankNew] = useState(false);

  // 🐱 吹き出しに表示するレート（ゲージと一緒にカウントアップする）
  const [displayRating, setDisplayRating] = useState(ratingBefore);

  // 🐱 いま目指しているゴール（ランクが変わる瞬間に切り替える）
  const [displayNext, setDisplayNext] = useState<NextTarget>(() =>
    toNextTarget(beforeInfo),
  );

  // 🐱 カウントアップ用：レートそのものを動かす Animated.Value
  const ratingAnim = useMemo(() => new Animated.Value(ratingBefore), []);

  // 🐱 値が動くたびに、整数に丸めて表示用 state に反映する
  useEffect(() => {
    const id = ratingAnim.addListener(({ value }) => {
      setDisplayRating(Math.round(value));
    });
    return () => ratingAnim.removeListener(id);
  }, [ratingAnim]);

  // giant killing コンボ判定(ボーナス発生 & 2回以上 & 差分が割り切れる場合のみ段階アニメーション)
  const ratingDiff = ratingAfter - ratingBefore;
  const isCombo =
    giantKillingBonus &&
    giantKillingStreak >= 2 &&
    ratingDiff !== 0 &&
    ratingDiff % giantKillingStreak === 0;

  const [bonusMultiplier, setBonusMultiplier] = useState<number | null>(null);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // 🐱 ゲージとレートを「同時に・同じ時間で」動かす
    const run = (
      percentTo: number,
      ratingTo: number,
      duration: number,
      onDone?: () => void,
    ) => {
      Animated.parallel([
        Animated.timing(progressAnim, {
          toValue: percentTo,
          duration,
          useNativeDriver: false,
        }),
        Animated.timing(ratingAnim, {
          toValue: ratingTo,
          duration,
          useNativeDriver: false,
        }),
      ]).start(onDone);
    };

    // 🐱 ランクをまたぐとき、ゲージが端っこ（100% or 0%）に着いた時点のレート
    //    昇格 → 次のランクの minRating、降格 → 今のランクの minRating
    const getBoundaryRating = (info: RankInfo, direction: number) =>
      direction > 0
        ? RANKS[info.index + 1].minRating
        : RANKS[info.index].minRating;

    if (isCombo) {
      // --- giant killing コンボ: chunkごとにゲージと数字を段階的に動かす ---
      const signedChunk = ratingDiff / giantKillingStreak;
      let prevInfo = beforeInfo;
      let stepIndex = 0;

      const animateToPercent = (
        targetPercent: number,
        targetRating: number,
        boundaryRating: number,
        nextTarget: NextTarget,
        isTransition: boolean,
        direction: number,
        onDone: () => void,
      ) => {
        if (isTransition) {
          run(direction > 0 ? 100 : 0, boundaryRating, 400, () => {
            setIsRankNew(true);
            // 🐱 ランクが切り替わる瞬間に、目指すゴールも新しいものに切り替える
            setDisplayNext(nextTarget);
            progressAnim.setValue(direction > 0 ? 0 : 100);
            run(targetPercent, targetRating, 400, onDone);
          });
        } else {
          run(targetPercent, targetRating, 500, onDone);
        }
      };

      const runStep = () => {
        stepIndex += 1;
        const stepRating = ratingBefore + signedChunk * stepIndex;
        const stepInfo = getRankInfo(stepRating, t);
        const isTransition = stepInfo.name !== prevInfo.name;
        // 🐱 ランクをまたぐなら、またぐ前のランク(prevInfo)を基準に境目を求める
        const boundaryRating = isTransition
          ? getBoundaryRating(prevInfo, signedChunk)
          : stepRating;
        prevInfo = stepInfo;

        // 2回目以降のchunkはボーナス表示を出したまま、ゲージも同時に動かす
        if (stepIndex > 1) {
          setBonusMultiplier(stepIndex);
        }

        animateToPercent(
          stepInfo.percent,
          stepRating,
          boundaryRating,
          toNextTarget(stepInfo),
          isTransition,
          signedChunk,
          () => {
            if (stepIndex < giantKillingStreak) {
              runStep();
            }
          },
        );
      };

      progressAnim.setValue(beforeInfo.percent);
      runStep();
    } else {
      // --- 通常のアニメーション(コンボなし) ---
      const rankTransition = rankIndexAfter !== rankIndexBefore;

      if (rankTransition) {
        const direction = rankIndexAfter > rankIndexBefore ? 1 : -1;
        progressAnim.setValue(beforeInfo.percent);

        run(
          direction > 0 ? 100 : 0,
          getBoundaryRating(beforeInfo, direction),
          600,
          () => {
            setIsRankNew(true);
            // 🐱 ランクが切り替わる瞬間に、目指すゴールも新しいものに切り替える
            setDisplayNext(toNextTarget(afterInfo));
            progressAnim.setValue(direction > 0 ? 0 : 100);

            setTimeout(() => {
              run(afterInfo.percent, ratingAfter, 600);
            }, 100);
          },
        );
      } else {
        progressAnim.setValue(beforeInfo.percent);

        run(afterInfo.percent, ratingAfter, 1200);
      }
    }
  }, []);

  const displayRankName = isRankNew ? afterInfo.name : beforeInfo.name;

  // 🐱 あと何点か（ゴール − いまの数字。カウントアップと一緒に動く）
  const footerText = displayNext
    ? t("RankInfoModal.remaining", {
        nextRank: displayNext.name,
        rating: Math.max(displayNext.minRating - displayRating, 0),
      })
    : null;

  return (
    <View className="w-[100%]">
      {/* ランク名表示 */}
      <AppText
        className={`text-4xl text-center ${
          newlyAcquiredIcon !== undefined ? "mb-0" : "mb-4"
        }`}
        style={{ color: rankColor }}
      >
        {displayRankName}
      </AppText>

      {/* giant killing bonus コンボ表示 */}
      {bonusMultiplier !== null && (
        <AppText
          className="text-lg text-center mb-4"
          style={{ color: rankColor }}
        >
          {`${t("ResultModal.giantKillingStreakBonus")} × ${bonusMultiplier}`}
        </AppText>
      )}

      {/* 新規獲得アイコン表示 */}
      {newlyAcquiredIcon !== undefined && (
        <View className="my-6 w-full items-center justify-center">
          <AppText
            className="text-base mb-2 text-center"
            style={{ color: colors.text }}
          >
            {t("ResultModal.newIcons")}
          </AppText>

          <View className="flex-row flex-wrap justify-center items-center gap-4">
            {(() => {
              const isSelected = currentIconIndex === newlyAcquiredIcon;
              const isLoadingThis = loadingIndex === newlyAcquiredIcon;

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={loadingIndex !== null}
                  onPress={() => handleSelectIcon(newlyAcquiredIcon)}
                  className={`items-center justify-center p-2 rounded-3xl border-2 ${
                    isSelected ? "border-primary" : "border-backgroundStrong"
                  }`}
                  style={{
                    backgroundColor: colors.foreground,
                    width: 80,
                    height: 80,
                  }}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <AppImage
                      source={ICONS[newlyAcquiredIcon]}
                      style={{
                        width: 64,
                        height: 64,
                        opacity: loadingIndex !== null ? 0.5 : 1, // このopacityは許可
                      }}
                      contentFit="contain"
                    />
                  )}
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
      )}

      {/* 🐱 ゲージ（吹き出し + ゲージ + あと◯）。動かすのはこの画面の仕事 */}
      <RankGauge
        progress={progressAnim}
        color={rankColor}
        height={32}
        bubbleText={displayRating}
        footerText={footerText}
        reserveFooterSpace
      />

      {/* アクションボタン群 */}
      <View className="flex-row mt-8 items-center justify-center w-full gap-8">
        {/* ホームに戻る */}
        <TouchableOpacity
          className="items-center justify-center"
          onPress={() => {
            onClose();
            setTimeout(() => {
              router.replace({ pathname: "/HomeScreen" });
            }, 0);
          }}
        >
          <Octicons name="home" size={24} color={colors.textSub} />
          <AppText
            className="text-sm mt-1 text-center"
            style={{ color: colors.textSub }}
          >
            {t("common.home")}
          </AppText>
        </TouchableOpacity>

        {/* 再戦（マッチング開始） */}
        <TouchableOpacity
          className="items-center justify-center"
          disabled={isMatching}
          onPress={() => {
            startMatching(boardSize);
          }}
        >
          <FontAwesome
            name="repeat"
            size={22}
            color={!isMatching ? colors.textSub : colors.backgroundStrong}
          />
          <AppText
            className="text-sm mt-1 text-center"
            style={{
              color: !isMatching ? colors.textSub : colors.backgroundStrong,
            }}
          >
            {t("common.playAgain")}
          </AppText>
        </TouchableOpacity>

        {/* 練習モードへ */}
        <TouchableOpacity
          className="items-center justify-center"
          onPress={() => {
            hide();
            router.push("/PracticeGameScreen");
          }}
        >
          <MaterialCommunityIcons
            name="robot"
            size={24}
            color={colors.textSub}
          />
          <AppText
            className="text-sm mt-1 text-center"
            style={{
              color: colors.textSub,
            }}
          >
            {t("common.bot")}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
