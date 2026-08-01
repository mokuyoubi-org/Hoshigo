import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  visible?: boolean;
  isLeft: boolean;
};

export function Pass({ visible = true, isLeft }: Props) {
  const t = useTranslation();

  return (
    <View style={[styles.wrapper, { opacity: visible ? 1 : 0 }]}>
      <View style={styles.bubble}>
        <Text style={styles.label}>{t("common.pass")}</Text>
      </View>
      <View
        style={[styles.tailBorder, isLeft ? styles.tailLeft : styles.tailRight]}
      />
      <View
        style={[
          styles.tailFill,
          isLeft ? styles.tailFillLeft : styles.tailFillRight,
        ]}
      />
    </View>
  );
}

const TAIL_SIZE = 5;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
  },
  bubble: {
    backgroundColor: COLORS.foreground,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: 0.4,
  },
  tailBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopWidth: TAIL_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.primary,
    marginTop: 0,
  },
  tailFill: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopWidth: TAIL_SIZE * 2,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.foreground,
    bottom: 1,
  },
  tailLeft: {
    marginLeft: 10,
  },
  tailRight: {
    alignSelf: "flex-end",
    marginRight: 10,
  },
  tailFillLeft: {
    left: 10,
  },
  tailFillRight: {
    right: 10,
  },
});
