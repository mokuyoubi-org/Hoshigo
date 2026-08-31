// GameResultModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useLang, useTranslation } from "@/src/active/language/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { FontAwesome, Octicons } from "@expo/vector-icons";
import { BoardSize } from "expo-goband";
import { router } from "expo-router";
import { ModalShell } from "modal-shell";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import { ICONS } from "../../constants/icons";
import { useMatching } from "../../contexts/providers/MatchingContext";

type Props = {
  visible: boolean;
  resultComment: string;
  onClose: () => void;
  pointsBefore: number;
  pointsAfter: number;
  rankIndexBefore: number;
  rankIndexAfter: number;
  boardSize: BoardSize;
  newlyAcquiredIcons?: number[] | null;
};

export function GameResultModal({
  boardSize,
  visible,
  resultComment,
  onClose,
  pointsBefore,
  pointsAfter,
  rankIndexBefore,
  rankIndexAfter,
  newlyAcquiredIcons,
}: Props) {
  const { startMatching, isMatching } = useMatching();
  const t = useTranslation();
  const { lang } = useLang();

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
    () => getRankInfo(pointsBefore, t),
    [pointsBefore, t],
  );
  const afterInfo = useMemo(
    () => getRankInfo(pointsAfter, t),
    [pointsAfter, t],
  );

  const rankColor =
    COLORS[afterInfo.color as keyof typeof COLORS] || COLORS.text;
  const [isRankNew, setIsRankNew] = useState(false);

  useEffect(() => {
    if (!visible) {
      hasAnimated.current = false;
      return;
    }

    if (hasAnimated.current) return;
    hasAnimated.current = true;

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
  }, [visible]);

  const displayRankName = isRankNew ? afterInfo.name : beforeInfo.name;

  const winsNeeded = afterInfo.next?.winsNeeded ?? 0;
  const winText = lang === "en" ? (winsNeeded === 1 ? "win" : "wins") : "";

  if (!visible) return null;

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      backgroundColor="#ffffff" // foreground
      style={{ padding: 20, alignItems: "center", justifyContent: "center" }}
    >
      <View className="w-full items-center justify-center">
        <Text
          className="my-[12px] text-[20px] font-bold text-center"
          style={{ color: COLORS.text }}
        >
          {resultComment}
        </Text>

        <Text
          className={`text-[40px] font-[800] tracking-[1px] text-center ${
            newlyAcquiredIcons && newlyAcquiredIcons.length > 0
              ? "mb-0"
              : "mb-[20px]"
          }`}
          style={{ color: rankColor }}
        >
          {displayRankName}
        </Text>

        {newlyAcquiredIcons && newlyAcquiredIcons.length > 0 && (
          <View className="my-[16px] w-full items-center justify-center">
            <Text
              className="text-[14px] font-bold mb-[8px] text-center"
              style={{ color: COLORS.text }}
            >
              {t("ResultModal.newIcons")}
            </Text>

            <View className="flex-row flex-wrap justify-center items-center gap-[12px]">
              {newlyAcquiredIcons.map((iconId) => (
                <View
                  key={iconId}
                  className="items-center p-[8px] rounded-[12px] border-2 border-primaryLight"
                  style={{ backgroundColor: COLORS.foreground }}
                >
                  <Image
                    source={ICONS[iconId]}
                    style={{ width: 64, height: 64, resizeMode: "contain" }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

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

        <View className="flex-row mt-[24px] items-center justify-center w-full gap-[32px]">
          <TouchableOpacity
            className="items-center justify-center"
            onPress={() => {
              onClose();
              setTimeout(() => {
                router.replace({
                  pathname: "/HomeScreen",
                });
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

          <TouchableOpacity
            className={`items-center justify-center ${
              isMatching ? "opacity-40" : "opacity-100"
            }`}
            disabled={isMatching}
            onPress={() => {
              startMatching(boardSize);
            }}
          >
            <FontAwesome name="repeat" size={22} color={COLORS.textSub} />
            <Text
              className="text-[12px] mt-[4px] text-center"
              style={{ color: COLORS.textSub }}
            >
              {t("ResultModal.playAgain")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalShell>
  );
}
