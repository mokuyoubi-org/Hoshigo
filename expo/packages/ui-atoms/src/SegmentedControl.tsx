// SegmentedControl.tsx

import React from "react";
import {
  ColorValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props<T extends string | number> = {
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
  trackBackgroundColor: ColorValue;
  activeSegmentBackgroundColor: ColorValue;
  activeTextColor: ColorValue;
  inactiveTextColor: ColorValue;
  fontFamily: string; // 文字のフォント(省略時はシステムのフォント)
  activeSegmentWidth?: number; // 選択されている部分の横幅
  inactiveSegmentWidth?: number; // 選択されていない部分の横幅
  height?: number;
};

// 数字だけを抜き出す関数
// 使っているので消さない！2026/09/30
const extractNumber = (text: string): string => {
  return text.match(/\d+/)?.[0] ?? text;
};

export const SegmentedControl = <T extends string | number>({
  value,
  options,
  onSelect,
  trackBackgroundColor,
  activeSegmentBackgroundColor,
  activeTextColor,
  inactiveTextColor,
  activeSegmentWidth = 72,
  inactiveSegmentWidth = 50,
  fontFamily,
  height = 54,
}: Props<T>) => {
  // 全体の横幅を自動計算する
  const padding = height * 0.1;
  const calculatedWidth =
    activeSegmentWidth !== undefined && inactiveSegmentWidth !== undefined
      ? activeSegmentWidth +
        inactiveSegmentWidth * (options.length - 1) +
        padding * 2
      : undefined;

  const fontStyle = fontFamily ? { fontFamily } : null;

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackBackgroundColor,
          height,
          borderRadius: height * 0.3,
          padding,
        },
        calculatedWidth !== undefined && { width: calculatedWidth },
      ]}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        // 選ばれているときはそのまま、選ばれていないときは数字だけに変換する
        const displayLabel = isActive
          ? option.label
          : extractNumber(option.label);

        // 選ばれているときと選ばれていないときで横幅を切り替える
        const currentWidth = isActive
          ? activeSegmentWidth
          : inactiveSegmentWidth;

        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              styles.segment,
              { borderRadius: height * 0.24 },
              currentWidth !== undefined && { width: currentWidth },
              isActive && { backgroundColor: activeSegmentBackgroundColor },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? activeTextColor : inactiveTextColor,
                  fontSize: height * 0.32,
                },
                fontStyle,
              ]}
            >
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    zIndex: 10,
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    includeFontPadding: false, // ⚠️Android用。大事
  },
});
