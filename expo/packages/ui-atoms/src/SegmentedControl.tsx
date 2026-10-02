// SegmentedControl.tsx
import React from "react";
import {
  ColorValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type Props<T extends string | number> = {
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
  trackBackgroundColor: ColorValue;
  activeSegmentBackgroundColor: ColorValue;
  activeTextColor: ColorValue;
  inactiveTextColor: ColorValue;
  activeSegmentWidth?: number; // 選択されている部分の横幅
  inactiveSegmentWidth?: number; // 選択されていない部分の横幅
  trackStyle?: ViewStyle;
  segmentStyle?: ViewStyle;
  fontFamily: string; // 文字のフォント(省略時はシステムのフォント)
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
  trackStyle,
  segmentStyle,
  fontFamily,
}: Props<T>) => {
  // 全体の横幅を自動計算する
  // (どちらの幅も数値で渡されているときだけ計算するよ)
  const calculatedWidth =
    activeSegmentWidth !== undefined && inactiveSegmentWidth !== undefined
      ? activeSegmentWidth + inactiveSegmentWidth * (options.length - 1) + 8 // 8はTrackの左右padding(4 + 4)のぶん
      : undefined;

  const fontStyle = fontFamily ? { fontFamily } : null;

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackBackgroundColor },
        calculatedWidth !== undefined && { width: calculatedWidth },
        trackStyle,
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
              currentWidth !== undefined && { width: currentWidth },
              segmentStyle,
              isActive && { backgroundColor: activeSegmentBackgroundColor },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? activeTextColor : inactiveTextColor },
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
    borderRadius: 20,
    padding: 4,
    height: 54,
    zIndex: 10,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  label: {
    fontSize: 16,
  },
});
