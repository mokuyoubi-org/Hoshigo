// SegmentedIconControl.tsx
// ====================================================================================
// 【ファイルの責務】
//  アイコン付きのセグメント式コントロールを提供する。
// ⚙️汎用コンポーネント
// ====================================================================================

import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type Option<T extends string | boolean> = {
  value: T;
  icon: React.ReactElement<{ size?: number; color?: string }>;
  color?: string; // 各アイコン固有の色をオプションで指定
};

type SegmentedIconControlProps<T extends string | boolean> = {
  value: T;
  options: readonly Option<T>[];
  onSelect: (value: T) => void;
  activeColor?: string;
  inactiveColor?: string; // 非選択時の共通デフォルト色も変更できるように追加
};

export const SegmentedIconControl = <T extends string | boolean>({
  value,
  options,
  onSelect,
  activeColor = "#ffffff",
  inactiveColor = "#b3bbc1",
}: SegmentedIconControlProps<T>) => {
  return (
    <View style={{ pointerEvents: "box-none" }}>
      <View style={styles.track}>
        {options.map((option) => {
          const isActive = value === option.value;
          // 個別の指定があればそれを優先し、なければデフォルト色を使う
          const defaultActiveColor = option.color ?? "#818487";
          const iconColor = isActive ? defaultActiveColor : inactiveColor;

          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[
                styles.segment,
                isActive && [
                  styles.segmentActive,
                  { backgroundColor: activeColor },
                ],
              ]}
              onPress={() => onSelect(option.value)}
              activeOpacity={0.8}
            >
              {React.cloneElement(option.icon, {
                size: 18,
                color: iconColor,
              })}
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
    borderRadius: 21, // 丸みを持たせてIconButtonとトーンを合わせる
    padding: 3,
    height: 42, // IconButtonの高さ(42px)に揃える
    alignItems: "center",
  },
  segment: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  segmentActive: {
    // 影をつけて浮き上がらせる
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});