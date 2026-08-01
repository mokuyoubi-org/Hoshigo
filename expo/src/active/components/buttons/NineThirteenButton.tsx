import { COLORS } from "@/src/active/constants/colors";
import { BoardSize } from "@/src/stable/types/goTypes";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  boardSize: BoardSize;
  onToggle: (boardSize: BoardSize) => void;
}

export const NineThirteenButton = ({ boardSize, onToggle }: Props) => {
  return (
    <View pointerEvents="box-none">
      <View style={styles.toggle}>
        {([9, 13] as const).map((v) => (
          <TouchableOpacity
            key={String(v)}
            style={[
              styles.toggleBtn,
              boardSize === v && styles.toggleBtnActive,
            ]}
            onPress={() => onToggle(v)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                boardSize === v && styles.toggleTextActive,
              ]}
            >
              {v === 9 ? "9×9" : "13×13"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 10,
    padding: 4,
    height: 38,
    zIndex: 10,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.foreground,
  },
  toggleText: {
    fontSize: 13,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: COLORS.text,
    fontWeight: "700",
  },
});
