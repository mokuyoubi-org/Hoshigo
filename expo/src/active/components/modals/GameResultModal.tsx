import { COLORS } from "@/src/active/constants/colors";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useLang, useTranslation } from "@/src/active/language/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { FontAwesome, Octicons } from "@expo/vector-icons";
import { BoardSize } from "expo-goband";
import { router } from "expo-router";
import { ModalShell } from "modal-shell";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ICONS } from "../../constants/icons";
import { useMatching } from "../../contexts/providers/MatchingContext";
import { useIconUpdate } from "../../hooks/others/useIconUpdate";

type Props = {
  visible: boolean;
  resultComment: string;
  onClose: () => void;
  ratingBefore: number;
  ratingAfter: number;
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
  ratingBefore,
  ratingAfter,
  rankIndexBefore,
  rankIndexAfter,
  newlyAcquiredIcons,
}: Props) {
  const { startMatching, isMatching } = useMatching();
  const t = useTranslation();
  const { lang } = useLang();

  const { iconIndex: currentIconIndex } = useProfile();
  const { updateIconIndex } = useIconUpdate();

  // 🆕 IconSelectModal と同じパターンで個別くるくるを管理するにゃ
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleSelectIcon = async (iconId: number) => {
    if (loadingIndex !== null || currentIconIndex === iconId) return;
    try {
      setLoadingIndex(iconId);
      await updateIconIndex(iconId);
    } finally {
      setLoadingIndex(null);
    }
  };

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
      onClose={loadingIndex !== null ? () => {} : onClose}
      size="lg"
      backgroundColor="#ffffff"
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
              {newlyAcquiredIcons.map((iconId) => {
                const isSelected = currentIconIndex === iconId;
                const isLoadingThis = loadingIndex === iconId;

                return (
                  <TouchableOpacity
                    key={iconId}
                    activeOpacity={0.7}
                    disabled={loadingIndex !== null}
                    onPress={() => handleSelectIcon(iconId)}
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
                        source={ICONS[iconId]}
                        style={{
                          width: 64,
                          height: 64,
                          resizeMode: "contain",
                          opacity: loadingIndex !== null ? 0.5 : 1,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
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
