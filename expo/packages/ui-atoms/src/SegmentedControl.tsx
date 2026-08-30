// SegmentedControl.tsx
// ====================================================================================
// 【ファイルの責務】
//  複数選択肢から1つを選ぶ、セグメント式のトグルスイッチを提供する。
// ⚙️汎用コンポーネント
// ====================================================================================

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ====================================================================================
// 【型定義・定数】
// ====================================================================================

// 🟩 コンポーネントのProps型定義
type SegmentedControlProps<T extends string | number> = {
  value: T; // 今選ばれている値。例: 9
  options: readonly { value: T; label: string }[]; // 選択肢の配列。例: [{value:9,label:"9x9"},{value:13,label:"13"}]
  onSelect: (value: T) => void; // valueを渡す関数。
};

// ====================================================================================
// 【コンポーネント本体】
// ====================================================================================

/**
 * 🟩🟦 使い方:
 * タブ切り替えやサイズ選択などに使える汎用トグルボタン。
 *  実際の使用例は、BOARD_SIZE_OPTIONSなどを参照。
 * 【例】
 * <SegmentedControl
 *   value={stateExample}
 *   options={[
 *     { value: 9, label: "9x9" },
 *     { value: 13, label: "13x13" }
 *   ]}
 *   onSelect={setStateExample}
 * />
 */
export const SegmentedControl = <T extends string | number>({
  value,
  options,
  onSelect,
}: SegmentedControlProps<T>) => {
  return (
    // 🌟 box-noneは、よそのタッチ機能のあるコンポーネントに迷惑をかけないような設定。
    <View style={{ pointerEvents: "box-none" }}>
      <View style={styles.track}>
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => onSelect(option.value)}
              activeOpacity={0.8} // ボタンを押すとちょっと色が薄くなる
            >
              <Text
                style={[
                  styles.label,
                  isActive ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {option.label}
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
    backgroundColor: "#e1e8ed", // backgroundDark
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
    backgroundColor: "#ffffff", // foreground
  },
  label: {
    fontSize: 13,
  },
  labelActive: {
    color: "#4e5256", // text
    fontWeight: "bold",
  },
  labelInactive: {
    color: "#95999e", // textSub
    fontWeight: "500",
  },
});
