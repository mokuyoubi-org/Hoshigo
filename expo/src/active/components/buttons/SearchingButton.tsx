import { COLORS } from "@/src/active/constants/colors";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useMatching } from "../../contexts/providers/MatchingContext";
import { useTranslation } from "../../language/i18n";

export const SearchingButton = () => {
  const { isMatching, matchingBoardSize, cancelMatching } = useMatching();
  const [isCanceling, setIsCanceling] = useState(false);
  const t = useTranslation();
  if (!isMatching) return null;

  const boardSizeText = matchingBoardSize
    ? `${matchingBoardSize}×${matchingBoardSize} `
    : " ";

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      await cancelMatching();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <View
      className={
        "absolute bottom-[90px] left-[20px] right-[20px] items-center z-[99]"
      }
      style={{ pointerEvents: "box-none" }}
    >
      <View className="flex-row items-center bg-foreground py-[10px] px-[16px] rounded-[25px] border-[4px] border-backgroundDark">
        {/* 🌟 キャンセル中で「ない」時だけ、左のクルクルを出す */}
        {!isCanceling && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            className="mr-[10px]"
          />
        )}

        {/* 検索中 / キャンセル中テキスト */}
        <Text className="text-[14px] font-semibold text-text mr-[14px]">
          {isCanceling
            ? t("common.canceling")
            : `${t("common.searching")} ${boardSizeText}...`}
        </Text>

        {/* キャンセル（×）ボタン */}
        <TouchableOpacity
          className="w-[32px] h-[32px] rounded-full bg-background justify-center items-center"
          onPress={handleCancel}
          activeOpacity={0.7}
          disabled={isCanceling}
        >
          {isCanceling ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text className="text-[16px] font-bold text-textSub">×</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
