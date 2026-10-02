// ToggleSwitch.tsx

import React, { useEffect, useState } from "react";
import { Animated, ColorValue, Pressable, StyleSheet } from "react-native";

type Props = {
  value: boolean;
  onToggle: (value: boolean) => void;
  backgroundOnColor: ColorValue;
  backgroundOffColor: ColorValue;
  toggleColor: ColorValue;
  disabled?: boolean;
};

// 🟨その他パラメータ。
const HITSLOP = 8; // トグルスイッチの反応範囲を上下左右のpadding何px分広げるか。ボタンの押しやすさのための配慮。
const ANIM_DURATION = 150; // 元のNativeWind版のduration-150に合わせる

// ⚠️ knobの移動距離(22px)は「レール幅52px − つまみ24px − 左右padding3px×2」を
//    あらかじめ計算した値。トラックやknobのサイズを変えたら、ここも手計算し直す必要がある。
const KNOB_TRANSLATE_X = 22;

export const ToggleSwitch = ({
  value,
  onToggle,
  backgroundOnColor, // primary
  backgroundOffColor, // backgroundStrong
  toggleColor, // foreground
  disabled,
}: Props) => {
  // 🌟 0(OFF)〜1(ON)の進捗値を1本だけ持つ。色もつまみの位置もここから作る！
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: ANIM_DURATION,
      // 色の補間はネイティブドライバー非対応なので false 固定
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  // 🎨 進捗値 → 色 / 位置 に変換
  // interpolate の outputRange は string[] が必要なので、ColorValue を string として扱う
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [backgroundOffColor as string, backgroundOnColor as string],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, KNOB_TRANSLATE_X],
  });

  return (
    <Pressable
      onPress={() => !disabled && onToggle(!value)}
      hitSlop={HITSLOP}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor, // primary
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [{ translateX }],
              backgroundColor: toggleColor, // foreground
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: "center",
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
