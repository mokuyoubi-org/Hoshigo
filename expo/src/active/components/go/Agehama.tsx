import { COLORS } from "@/src/active/constants/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  stoneSize?: number; // 将来的に使う場合のために残す
};

export function AgehamaDisplay({ count }: Props) {
  return (
    <View style={[styles.badge, count === 0 && styles.badgeZero]}>
      <Text style={styles.badgeText}>+{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeZero: {
    opacity: 0.25,
  },
  badgeText: {
    color: COLORS.foreground,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
