import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { useTheme } from "../lib/useTheme";

interface ReplayControlsProps {
  currentIndex: number;
  maxIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onSliderChange?: (value: number) => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  currentIndex,
  maxIndex,
  onPrevious,
  onNext,
  onSliderChange,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderColor }]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.button },
          currentIndex === 0 && { backgroundColor: colors.inactive },
        ]}
        onPress={onPrevious}
        disabled={currentIndex === 0}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            { color: colors.card },
            currentIndex === 0 && { color: colors.subtext },
          ]}
        >
          ◀
        </Text>
      </TouchableOpacity>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={maxIndex}
        step={1}
        value={currentIndex}
        onValueChange={onSliderChange}
        minimumTrackTintColor={colors.button}
        maximumTrackTintColor={colors.inactive}
        thumbTintColor={colors.button}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.button },
          currentIndex === maxIndex && { backgroundColor: colors.inactive },
        ]}
        onPress={onNext}
        disabled={currentIndex === maxIndex}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            { color: colors.card },
            currentIndex === maxIndex && { color: colors.subtext },
          ]}
        >
          ▶
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom:16,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "700",
  },
  slider: {
    flex: 1,
    height: 40,
  },
});