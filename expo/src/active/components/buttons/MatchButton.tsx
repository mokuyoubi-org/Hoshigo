// MatchButton.tsx

import { BoardSize } from "expo-goband";
import React, { useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";

type Props = {
  onPress: () => void;
  boardSize?: BoardSize;
  disabled?: boolean;
};

// アニメーションに関する定数設定
const SCALE_PRESSED = 0.96;
const FRICTION_PRESS_IN = 8;
const FRICTION_PRESS_OUT = 5;

export function MatchButton({ onPress, boardSize, disabled = false }: Props) {
  const [pressScale] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: SCALE_PRESSED,
      friction: FRICTION_PRESS_IN,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 1,
      friction: FRICTION_PRESS_OUT,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        {/* 全体のコンテナ（影のスペースを確保） */}
        <View
          className={`w-[280px] h-[82px] relative ${disabled ? "opacity-50" : ""}`}
        >
          {/* ① フラットな影（うすいグレーでやわらかい影にする） */}
          <View className="absolute bottom-0 left-1 w-full h-[76px] rounded-2xl bg-primary" />

          {/* ② ボタン本体（明るい白系の色にして、枠線も薄くする） */}
          <View className="absolute top-0 left-0 w-full h-[76px] rounded-2xl bg-foreground border-2 border-backgroundDark px-6 justify-center overflow-hidden">
            <View className="flex-row items-center justify-between">
              {/* 薄いボタンでも文字が読めるように濃いめの文字色にする */}
              <Text className="text-[20px] font-black text-text tracking-widest uppercase">
                ONLINE MATCH
              </Text>

              {/* 盤面サイズバッジ */}
              <View className="w-12 h-12 rounded-full bg-background items-center justify-center border border-slate-300">
                <Text className="text-text text-[20px] font-black">
                  {boardSize}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
