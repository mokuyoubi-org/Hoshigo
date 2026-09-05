// PinPoint.tsx
import React, { memo } from "react";
import { Image, StyleSheet } from "react-native";

const HAND_ICON = require("../../../assets/icons/hand.png");

// 🐱 ピンポイントの手アイコンを表示するだけの小さな部品
export const PinPoint = memo(function PinPoint() {
  return <Image source={HAND_ICON} style={styles.pinIcon} />;
});

const styles = StyleSheet.create({
  pinIcon: {
    position: "absolute",
    width: 80,
    height: 80,
    top: -40,
    left: -10,
    zIndex: 10,
  },
});
