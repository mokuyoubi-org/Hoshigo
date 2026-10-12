/**
 * TerritoryResultButton.tsx
 * 地計算ボタン
 * - 計算中 → くるくる（押せない）
 * - 結果あり・普段 → 電卓アイコンだけ（タップで、結果と盤面の地を表示）
 * - 結果あり・表示中 → 電卓アイコン + 結果テキスト（背景が濃くなる）
 *     表示中は、局面や編集モードを変えると普段の状態に戻る
 * - 結果なし → 何も表示しない
 */

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  isCalculating: boolean;
  result: { text: string } | null;
  isShown: boolean; // 結果と盤面の地を表示中かどうか
  onPress: () => void;
};

export const TerritoryResultButton = ({
  isCalculating,
  result,
  isShown,
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
            borderColor: colors.backgroundStrong,
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
          backgroundColor: isShown ? colors.primaryStrong : colors.primary,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <FontAwesome5 name="calculator" size={24} color={colors.foreground} />
      {isShown && (
        <MyText style={[styles.text, { color: colors.foreground }]}>
          {result.text}
        </MyText>
      )}
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
