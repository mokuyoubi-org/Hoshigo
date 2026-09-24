import {
  FontAwesome,
  MaterialCommunityIcons,
  Octicons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BoardSize } from "go-core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS } from "@/src/active/constants/colors";
import { ICONS } from "@/src/active/constants/icons";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useIconUpdate } from "@/src/active/hooks/useIconUpdate";
import { useLang, useTranslation } from "@/src/active/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { winsToNewlyAcquiredIconIndex } from "@/src/stable/logics/winsToAcquiredIcons";

type Props = {
  onClose: () => void;
  ratingBefore: number;
  ratingAfter: number;
  rankIndexBefore: number;
  rankIndexAfter: number;
  boardSize: BoardSize;
  giantKillingStreak: number;
};

export function GameResultContent({
  onClose,
  ratingBefore,
  ratingAfter,
  rankIndexBefore,
  rankIndexAfter,
  boardSize,
  giantKillingStreak,
}: Props) {
  const { hide } = useOverlay();
  const { startMatching, isMatching } = useMatching();
  const t = useTranslation();
  const { lang } = useLang();

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
  const { progressAnim, animatedWidth } = useMemo(() => {
    const anim = new Animated.Value(0);
    const width = anim.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });
    return { progressAnim: anim, animatedWidth: width };
  }, []);

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
    COLORS[afterInfo.color as keyof typeof COLORS] || COLORS.text;
  const [isRankNew, setIsRankNew] = useState(false);

  // giant killing コンボ判定(2回以上 & 差分が割り切れる場合のみ段階アニメーション)
  const ratingDiff = ratingAfter - ratingBefore;
  const isCombo =
    giantKillingStreak >= 2 &&
    ratingDiff !== 0 &&
    ratingDiff % giantKillingStreak === 0;

  const [bonusMultiplier, setBonusMultiplier] = useState<number | null>(null);
  const bonusScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (isCombo) {
      // --- giant killing コンボ: chunkごとにゲージを段階的に上げる ---
      const signedChunk = ratingDiff / giantKillingStreak;
      let prevInfo = beforeInfo;
      let stepIndex = 0;

      const animateToPercent = (
        targetPercent: number,
        isTransition: boolean,
        direction: number,
        onDone: () => void,
      ) => {
        if (isTransition) {
          Animated.timing(progressAnim, {
            toValue: direction > 0 ? 100 : 0,
            duration: 400,
            useNativeDriver: false,
          }).start(() => {
            setIsRankNew(true);
            progressAnim.setValue(direction > 0 ? 0 : 100);
            Animated.timing(progressAnim, {
              toValue: targetPercent,
              duration: 400,
              useNativeDriver: false,
            }).start(onDone);
          });
        } else {
          Animated.timing(progressAnim, {
            toValue: targetPercent,
            duration: 500,
            useNativeDriver: false,
          }).start(onDone);
        }
      };

      const runStep = () => {
        stepIndex += 1;
        const stepRating = ratingBefore + signedChunk * stepIndex;
        const stepInfo = getRankInfo(stepRating, t);
        const isTransition = stepInfo.name !== prevInfo.name;
        prevInfo = stepInfo;

        // 2回目以降のchunkはボーナス表示を出したまま、ゲージも同時に動かす
        if (stepIndex > 1) {
          setBonusMultiplier(stepIndex);
        }

        animateToPercent(stepInfo.percent, isTransition, signedChunk, () => {
          if (stepIndex < giantKillingStreak) {
            runStep();
          }
        });
      };

      progressAnim.setValue(beforeInfo.percent);
      runStep();
    } else {
      // --- 通常のアニメーション(コンボなし) ---
      const rankTransition = rankIndexAfter !== rankIndexBefore;

      if (rankTransition) {
        progressAnim.setValue(beforeInfo.percent);

        Animated.timing(progressAnim, {
          toValue: rankIndexAfter > rankIndexBefore ? 100 : 0,
          duration: 600,
          useNativeDriver: false,
        }).start(() => {
          setIsRankNew(true);
          progressAnim.setValue(rankIndexAfter > rankIndexBefore ? 0 : 100);

          setTimeout(() => {
            Animated.timing(progressAnim, {
              toValue: afterInfo.percent,
              duration: 600,
              useNativeDriver: false,
            }).start();
          }, 100);
        });
      } else {
        progressAnim.setValue(beforeInfo.percent);

        Animated.timing(progressAnim, {
          toValue: afterInfo.percent,
          duration: 1200,
          useNativeDriver: false,
        }).start();
      }
    }
  }, []);

  const displayRankName = isRankNew ? afterInfo.name : beforeInfo.name;
  const winsNeeded = afterInfo.next?.winsNeeded ?? 0;
  const winText = lang === "en" ? (winsNeeded === 1 ? "win" : "wins") : "";

  return (
    <>
      {/* ランク名表示 */}
      <Text
        className={`text-[40px] font-[800] tracking-[1px] text-center ${
          newlyAcquiredIcon !== undefined ? "mb-0" : "mb-[20px]"
        }`}
        style={{ color: rankColor }}
      >
        {displayRankName}
      </Text>

      {/* giant killing bonus コンボ表示 */}
      {bonusMultiplier !== null && (
        <Text
          className="text-[20px] font-[900] text-center mb-[8px]"
          style={{ color: rankColor }}
        >
          Giant Killing Bonus × {bonusMultiplier}
        </Text>
      )}

      {/* 新規獲得アイコン表示 */}
      {newlyAcquiredIcon !== undefined && (
        <View className="my-[16px] w-full items-center justify-center">
          <Text
            className="text-[14px] font-bold mb-[8px] text-center"
            style={{ color: COLORS.text }}
          >
            {t("ResultModal.newIcons")}
          </Text>

          <View className="flex-row flex-wrap justify-center items-center gap-[12px]">
            {(() => {
              const isSelected = currentIconIndex === newlyAcquiredIcon;
              const isLoadingThis = loadingIndex === newlyAcquiredIcon;

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={loadingIndex !== null}
                  onPress={() => handleSelectIcon(newlyAcquiredIcon)}
                  className={`items-center justify-center p-[8px] rounded-[12px] border-2 ${
                    isSelected ? "border-primary" : "border-primaryLight"
                  }`}
                  style={{
                    backgroundColor: COLORS.foreground,
                    width: 80,
                    height: 80,
                  }}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Image
                      source={ICONS[newlyAcquiredIcon]}
                      style={{
                        width: 64,
                        height: 64,
                        opacity: loadingIndex !== null ? 0.5 : 1,
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

      {/* ランク進行度プログレスバー */}
      <View
        className="w-full h-[24px] rounded-[24px] overflow-hidden relative"
        style={{ backgroundColor: COLORS.background }}
      >
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 24,
            backgroundColor: rankColor,
            width: animatedWidth,
          }}
        />
      </View>

      {/* 次のランクまでの必要勝利数 */}
      {afterInfo.next && (
        <Text
          className="mt-[8px] font-[600] text-center"
          style={{ color: COLORS.text }}
        >
          {t("ResultModal.remaining", {
            nextRank: afterInfo.next.name,
            wins: winsNeeded,
            winText: winText,
          })}
        </Text>
      )}

      {/* アクションボタン群 */}
      <View className="flex-row mt-[24px] items-center justify-center w-full gap-[32px]">
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
          <Octicons name="home" size={24} color={COLORS.textSub} />
          <Text
            className="text-[12px] mt-[4px] text-center"
            style={{ color: COLORS.textSub }}
          >
            {t("ResultModal.home")}
          </Text>
        </TouchableOpacity>

        {/* 再戦（マッチング開始） */}
        <TouchableOpacity
          className={`items-center justify-center ${
            isMatching ? "opacity-40" : "opacity-100"
          }`}
          disabled={isMatching}
          onPress={() => {
            hide();
            startMatching(boardSize);
          }}
        >
          <FontAwesome name="repeat" size={22} color={COLORS.textSub} />
          <Text
            className="text-[12px] mt-[4px] text-center"
            style={{ color: COLORS.textSub }}
          >
            {t("common.playAgain")}
          </Text>
        </TouchableOpacity>

        {/* 練習モードへ */}
        <TouchableOpacity
          className={`items-center justify-center ${
            isMatching ? "opacity-40" : "opacity-100"
          }`}
          disabled={isMatching}
          onPress={() => {
            hide();
            router.push("/PracticeGameScreen");
          }}
        >
          <MaterialCommunityIcons
            name="robot"
            size={22}
            color={COLORS.textSub}
          />
          <Text
            className="text-[12px] mt-[4px] text-center"
            style={{ color: COLORS.textSub }}
          >
            {t("common.bot")}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
