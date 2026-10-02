/**
 * TerritoryResultBadge.tsx
 * 地計算の結果バッジ
 * - 計算中 → くるくる（押せない）
 * - 結果あり → 電卓アイコン + 結果テキスト（タップで盤面に地を表示）
 *     背景 primary     = 未確定（終局前の暫定表示）
 *     背景 primaryDark = 確定（終局した局面）
 * - 結果なし → 何も表示しない
 */

import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

type Props = {
  isCalculating: boolean;
  result: { text: string; isFinal: boolean } | null;
  onPress: () => void;
};

export const TerritoryResultBadge = ({
  isCalculating,
  result,
  onPress,
}: Props) => {
  const colors = useColors();

  if (isCalculating) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.foreground,
            borderColor: colors.backgroundDark,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!result) return null;

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          backgroundColor: result.isFinal ? colors.primaryDark : colors.primary,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* <FontAwesome5 name="calculator" size={24} color={colors.foreground} /> */}
      <AppText style={[styles.text, { color: colors.foreground }]}>
        {result.text}
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    height: 54,
    minWidth: 80,
    borderRadius: 24,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 14,
  },
});