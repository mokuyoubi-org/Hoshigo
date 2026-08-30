// ✅active

/**
 * MainButton.tsx
 * メインボタン。
 */
import { useTranslation } from "@/src/active/language/i18n";
import { BoardSize } from "expo-goband";
import React, { useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

type MainButtonProps = {
  onPress: () => void;
  boardSize: BoardSize;
  disabled?: boolean;
};

// 🟨 アニメーションに関する定数設定
const SCALE_PRESSED = 0.94; // 押したときの縮小サイズ
const FRICTION_PRESS_IN = 8; // 押したときのスプリングの摩擦
const FRICTION_PRESS_OUT = 6; // 離したときのスプリングの摩擦

export function MainButton({
  onPress,
  boardSize,
  disabled = false,
}: MainButtonProps) {
  const [pressScale] = useState(() => new Animated.Value(1));
  const t = useTranslation();

  // 指が触れたときに縮める
  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: SCALE_PRESSED,
      friction: FRICTION_PRESS_IN,
      useNativeDriver: true,
    }).start();
  };

  // 指が離れたときに元の大きさに戻す
  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 1,
      friction: FRICTION_PRESS_OUT,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View className="flex-1 items-center justify-center">
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8} // デフォルトの透明化アニメーションを無効化してAnimatedに任せる
        disabled={disabled}
      >
        <View className="rounded-full">
          <Animated.View style={{ transform: [{ scale: pressScale }] }}>
            <View
              className={`w-[180px] h-[180px] rounded-full bg-foreground border-[8px] border-primary justify-center items-center ${
                disabled ? "opacity-40" : ""
              }`}
            >
              {/* 上部の小さいラベル（例: "TAP" など） */}
              <Text className="text-[9px] tracking-[4px] text-text mb-[6px] text-center">
                {t("Home.tap")}
              </Text>

              {/* メインテキスト（例: "プレイ"） */}
              <Text className="text-[28px] font-extrabold text-text tracking-[2px] text-center">
                {t("common.play")}
              </Text>

              {/* 盤面サイズ表示（例: "19路"） */}
              <Text className="text-[28px] font-extrabold text-text tracking-[2px] text-center">
                {boardSize}
              </Text>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
