// SearchingButton/SearchingButton.web.tsx

import { COLORS } from "@/src/active/constants/colors";
import React, { useSyncExternalStore } from "react";
import ReactDOM from "react-dom";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSearchingButtonState } from "./useSearchingButtonState";

const emptySubscribe = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function SearchingButton() {
  const isHydrated = useIsHydrated();
  const {
    shouldRender,
    fadeAnim,
    slideAnim,
    isCanceling,
    boardSizeText,
    handleCancel,
    t,
  } = useSearchingButtonState();

  if (!isHydrated || typeof document === "undefined" || !shouldRender) {
    return null;
  }

  return ReactDOM.createPortal(
    <Animated.View
      style={
        {
          position: "fixed",
          bottom: 90,
          left: 20,
          right: 20,
          zIndex: 100,
          alignItems: "center",
          pointerEvents: "box-none",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        } as any
      }
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
    </Animated.View>,
    document.body,
  );
}
