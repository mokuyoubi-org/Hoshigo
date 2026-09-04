// SearchingButton/SearchingButton.native.tsx

import { COLORS } from "@/src/active/constants/colors";
import React from "react";
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from "react-native";
import { useSearchingButtonState } from "./useSearchingButtonState";

export function SearchingButton() {
  const {
    shouldRender,
    fadeAnim,
    slideAnim,
    isCanceling,
    boardSizeText,
    handleCancel,
    t,
  } = useSearchingButtonState();

  if (!shouldRender) return null;

  return (
    <Animated.View
      className="absolute bottom-[90px] left-[20px] right-[20px] items-center z-[100]"
      style={{
        pointerEvents: "box-none",
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View className="flex-row items-center bg-foreground py-[10px] px-[16px] rounded-[25px] border-[4px] border-backgroundDark">
        {!isCanceling && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            className="mr-[10px]"
          />
        )}

        <Text className="text-[14px] font-semibold text-text mr-[14px]">
          {isCanceling
            ? t("common.canceling")
            : `${t("common.searching")} ${boardSizeText}...`}
        </Text>

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
    </Animated.View>
  );
}