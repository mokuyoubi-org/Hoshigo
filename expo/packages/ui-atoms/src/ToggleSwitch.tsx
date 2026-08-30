// ToggleSwitch.tsx
// ====================================================================================
// 【ファイル全体の責務】
//  ToggleSwitchコンポーネントを提供する。
// ⚙️汎用コンポーネント。
// ====================================================================================

import React, { useEffect } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  useAnimatedValue,
} from "react-native";

// ====================================================================================
// 【型定義・定数】
// ====================================================================================

// 🟩型定義
type ToggleSwitchProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
};

// 🟨その他パラメータ。
const HITSLOP = 8; // トグルスイッチの反応範囲を上下左右のpadding何px分広げるか。ボタンの押しやすさのための配慮。
const ANIM_DURATION = 150; // 元のNativeWind版のduration-150に合わせる

// ⚠️ knobの移動距離(22px)は「レール幅52px − つまみ24px − 左右padding3px×2」を
//    あらかじめ計算した値。トラックやknobのサイズを変えたら、ここも手計算し直す必要がある。
const KNOB_TRANSLATE_X = 22;

// ====================================================================================
// 【コンポーネント本体】
// ====================================================================================

/**
 * 🟩🟦 使い方:
 * スマホのON/OFF切り替えスイッチ。
 *
 * 【例】
 * <ToggleSwitch
 *   value={allowBotMatch}
 *   onToggle={handleToggleBotMatch}
 *   disabled={isMatching}
 * />
 *
 * onToggle: トグルが変化した時に呼び出される関数。
 * value: 関数に渡す値(bool型)。
 * disabled: ボタンを使用不可にしたい時に渡す値(bool型)。必須ではない。
 */
export const ToggleSwitch = ({
  value,
  onToggle,
  disabled,
}: ToggleSwitchProps) => {
  // 🌟 useAnimatedValueはレンダー中にref.currentを読まない安全な遅延初期化フック
  //    (ModalShell.native.tsxのfadeAnim/scaleAnimと同じ書き方)
  const opacityAnim = useAnimatedValue(disabled ? 0.2 : value ? 1 : 0.3);
  const knobAnim = useAnimatedValue(value ? KNOB_TRANSLATE_X : 0);

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: disabled ? 0.2 : value ? 1 : 0.3,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start();
  }, [disabled, value, opacityAnim]);

  useEffect(() => {
    Animated.timing(knobAnim, {
      toValue: value ? KNOB_TRANSLATE_X : 0,
      duration: ANIM_DURATION,
      useNativeDriver: true,
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
      <Animated.View style={[styles.track, { opacity: opacityAnim }]}>
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: knobAnim }] }]}
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
    backgroundColor: "#b4c9db", // primary
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff", // foreground
  },
});
