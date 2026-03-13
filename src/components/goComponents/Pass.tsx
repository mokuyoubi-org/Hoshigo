import React from "react";
import { StyleSheet, Text, View } from "react-native";

type PassProps = {
  isBlackPass: boolean;
};

export const Pass: React.FC<PassProps> = ({ isBlackPass }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <Text style={styles.label}>Pass</Text>
      </View>
      {/* しっぽ外枠（ボーダー色） */}
      <View style={[styles.tailBorder, isBlackPass ? styles.tailLeft : styles.tailRight]} />
      {/* しっぽ内塗り（白） */}
      <View style={[styles.tailFill, isBlackPass ? styles.tailFillLeft : styles.tailFillRight]} />
    </View>
  );
};

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
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
  // 黒番（左）：しっぽ左寄り
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