import { useTheme } from "@/src/hooks/useTheme";
import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ReplayControlsProps {
  currentIndex: number;
  maxIndex: number;
  onCurrentIndexChange: any;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  currentIndex,
  maxIndex,
  onCurrentIndexChange: onReplayIndexChange,
}) => {
  // 一つ前に戻るボタンを押した時の処理
  const onPrevious = () => {
    if (currentIndex > 0) {
      onReplayIndexChange(currentIndex - 1);
    }
  };
  // 一つ次に進むボタンを押した時の処理
  const onNext = () => {
    if (currentIndex < maxIndex - 1) {
      onReplayIndexChange(currentIndex + 1);
    }
  };
  // スライダーを動かした時の処理
  const onSliderChange = (value: number) => {
    onReplayIndexChange(Math.round(value));
  };

  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.borderColor },
      ]}
    >
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
    // justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
