// ToggleSwitch.tsx

import React, { useEffect, useState } from "react";
import {
  Animated,
  ColorValue,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";

type ToggleSwitchProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  backgroundColor: ColorValue;
  toggleColor: ColorValue;
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
  disabled,
  backgroundColor,
  toggleColor,
}: ToggleSwitchProps) => {
  // 🌟 useState の初期化関数を使うことで、ref を使わずにインスタンスを1度だけ保持する！
  const [opacityAnim] = useState(
    () => new Animated.Value(disabled ? 0.2 : value ? 1 : 0.3),
  );
  const [knobAnim] = useState(
    () => new Animated.Value(value ? KNOB_TRANSLATE_X : 0),
  );

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: disabled ? 0.2 : value ? 1 : 0.3,
      duration: ANIM_DURATION,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [disabled, value, opacityAnim]);

  useEffect(() => {
    Animated.timing(knobAnim, {
      toValue: value ? KNOB_TRANSLATE_X : 0,
      duration: ANIM_DURATION,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [value, knobAnim]);

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
            opacity: opacityAnim,
            backgroundColor: backgroundColor, // primary
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [{ translateX: knobAnim }],
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
