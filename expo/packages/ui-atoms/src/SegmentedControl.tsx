// SegmentedControl.tsx
import React from "react";
import {
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
  // 選択されている部分の横幅
  activeSegmentWidth?: number;
  // 選択されていない部分の横幅
  inactiveSegmentWidth?: number;
  trackStyle?: ViewStyle;
  segmentStyle?: ViewStyle;
};

// 数字だけを抜き出す関数
const extractNumber = (text: string): string => {
  return text.match(/\d+/)?.[0] ?? text;
};

export const SegmentedControl = <T extends string | number>({
  value,
  options,
  onSelect,
  activeSegmentWidth,
  inactiveSegmentWidth,
  trackStyle,
  segmentStyle,
}: Props<T>) => {
  // 全体の横幅を自動計算する
  // (どちらの幅も数値で渡されているときだけ計算するよ)
  const calculatedWidth =
    activeSegmentWidth !== undefined && inactiveSegmentWidth !== undefined
      ? activeSegmentWidth + inactiveSegmentWidth * (options.length - 1) + 8 // 8はTrackの左右padding(4 + 4)のぶん
      : undefined;

  return (
    <View
      style={[
        styles.track,
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
              isActive && styles.segmentActive,
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
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
    backgroundColor: "#e1e8ed",
    borderRadius: 18,
    padding: 4,
    height: 48,
    zIndex: 10,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
  },
  label: {
    fontSize: 14,
  },
  labelActive: {
    color: "#4e5256",
    fontWeight: "bold",
  },
  labelInactive: {
    color: "#95999e",
    fontWeight: "500",
  },
});
