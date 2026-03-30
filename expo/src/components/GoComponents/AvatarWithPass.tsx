import { Color } from "@/src/lib/goLogics";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Avatar } from "./Avatar";
import { Pass } from "./Pass";

const PASS_SLOT_HEIGHT = 28;
const PASS_OVERLAP = 10;

type Props = {
  gumiIndex: number;
  iconIndex: number;
  size: number;
  color?: Color;
  isLeft: boolean;
  showPass?: boolean;
};

const AvatarWithPassComponent = ({
  gumiIndex,
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
        gumiIndex={gumiIndex}
        iconIndex={iconIndex}
        size={size}
        color={color}
      />
    </View>
  );
};

export const AvatarWithPass = React.memo(AvatarWithPassComponent);

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
