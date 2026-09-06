// SegmentedControl.tsx
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type SegmentedControlProps<T extends string | number> = {
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
};

// 数字だけを抜き出す関数
const extractNumber = (text: string): string => {
  return text.match(/\d+/)?.[0] ?? text;
};

export const SegmentedControl = <T extends string | number>({
  value,
  options,
  onSelect,
}: SegmentedControlProps<T>) => {
  return (
    <View style={{ pointerEvents: "box-none" }}>
      <View style={styles.track}>
        {options.map((option) => {
          const isActive = value === option.value;

          // 選ばれているときはそのまま、選ばれていないときは数字だけに変換する
          const displayLabel = isActive
            ? option.label
            : extractNumber(option.label);

          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.segment, isActive && styles.segmentActive]}
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
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "#e1e8ed",
    borderRadius: 10,
    padding: 4,
    height: 38,
    zIndex: 10,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
  },
  label: {
    fontSize: 13,
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
