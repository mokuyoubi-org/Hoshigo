import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  boardSize: number;
  onToggle: (boardSize: number) => void;
}

export const FloatingToggle = ({ boardSize, onToggle }: Props) => {
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
              {v === 9 ? "9路" : "13路"}
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
    backgroundColor: "rgba(239,239,239,0.85)",
    borderRadius: 10,
    padding: 4,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
  },
  toggleText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#333",
    fontWeight: "700",
  },
});
