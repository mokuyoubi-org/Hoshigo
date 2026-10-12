// SegmentedIconControl.tsx

import React from "react";
import { ColorValue, StyleSheet, TouchableOpacity, View } from "react-native";

type Option<T extends string | boolean> = {
  value: T;
  icon: React.ReactElement<{ size?: number; color?: ColorValue }>;
  color?: ColorValue; // 各アイコン固有の色をオプションで指定
};

type Props<T extends string | boolean> = {
  value: T;
  options: readonly Option<T>[];
  onSelect: (value: T) => void;
  trackBackgroundColor: ColorValue;
  activeSegmentBackgroundColor: ColorValue;
  activeIconColor: ColorValue;
  inactiveIconColor: ColorValue;
};

export const SegmentedIconControl = <T extends string | boolean>({
  value,
  options,
  onSelect,
  trackBackgroundColor,
  activeSegmentBackgroundColor,
  activeIconColor,
  inactiveIconColor,
}: Props<T>) => {
  return (
    <View style={[styles.track, { backgroundColor: trackBackgroundColor }]}>
      {options.map((option) => {
        const isActive = value === option.value;
        // 個別の指定があればそれを優先し、なければ渡されたアクティブ時用アイコン色を使う
        const defaultActiveColor = option.color ?? activeIconColor;
        const iconColor = isActive ? defaultActiveColor : inactiveIconColor;

        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              styles.segment,
              isActive && { backgroundColor: activeSegmentBackgroundColor },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            {React.cloneElement(option.icon, {
              size: 20,
              color: iconColor,
            })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: 54, // 丸みを持たせてIconButtonとトーンを合わせる
    padding: 6,
    height: 54, // IconButtonの高さ(42px)に揃える
    alignItems: "center",
  },
  segment: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
  },
});
