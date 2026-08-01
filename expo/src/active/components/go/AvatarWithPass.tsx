import { Avatar } from "@/src/active/components/go/Avatar";
import { Pass } from "@/src/active/components/go/Pass";
import { Color } from "@/src/stable/types/goTypes";
import React from "react";
import { StyleSheet, View } from "react-native";

const PASS_SLOT_HEIGHT = 28;
const PASS_OVERLAP = 10;

type Props = {
  groupIndex: number;
  iconIndex: number;
  size: number;
  color?: Color;
  isLeft: boolean;
  showPass?: boolean;
};

export const AvatarWithPass = ({
  groupIndex,
  iconIndex,
  size,
  color,
  isLeft,
  showPass = false,
}: Props) => {
  return (
    <View style={isLeft ? styles.containerLeft : styles.containerRight}>
      <View
        style={[
          styles.passSlot,
          isLeft ? styles.passSlotLeft : styles.passSlotRight,
        ]}
      >
        <Pass visible={showPass} isLeft={isLeft} />
      </View>
      <Avatar
        groupIndex={groupIndex}
        iconIndex={iconIndex}
        size={size}
        color={color}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containerLeft: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  containerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  passSlot: {
    height: PASS_SLOT_HEIGHT,
    marginBottom: -PASS_OVERLAP,
    justifyContent: "flex-end",
    zIndex: 1,
  },
  passSlotLeft: {
    alignItems: "flex-start",
  },
  passSlotRight: {
    alignItems: "flex-end",
  },
});
