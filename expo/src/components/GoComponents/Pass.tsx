import { useTranslation } from "@/src/contexts/LocaleContexts";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  isLeft: boolean;
};

export function Pass({ visible = true, isLeft }: Props) {
  if (!visible) return null; // 非表示なら何も描画しない
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
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

const BUBBLE_BG = "#ffffff";
const TAIL_SIZE = 5;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
  },
  bubble: {
    backgroundColor: BUBBLE_BG,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.13)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#444",
    letterSpacing: 0.4,
  },
  tailBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopWidth: TAIL_SIZE * 2,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0,0,0,0.13)",
    marginTop: -0.5,
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
    borderTopColor: BUBBLE_BG,
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
