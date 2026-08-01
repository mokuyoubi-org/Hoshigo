import { COLORS } from "@/src/active/constants/colors";
import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SetState } from "../../types/commonTypes";

type Props = {
  currentIndex: number;
  maxIndex: number;
  onCurrentIndexChange: SetState<number>;
};

export function ReplayControls({
  currentIndex,
  maxIndex,
  onCurrentIndexChange,
}: Props) {
  // 一つ前に戻るボタンを押した時の処理
  const onPrevious = () => {
    if (currentIndex > 0) {
      onCurrentIndexChange(currentIndex - 1);
    }
  };
  // 一つ次に進むボタンを押した時の処理
  const onNext = () => {
    if (currentIndex < maxIndex) {
      onCurrentIndexChange(currentIndex + 1);
    }
  };
  // スライダーを動かした時の処理
  const onSliderChange = (value: number) => {
    onCurrentIndexChange(Math.round(value));
  };

  return (
    <View style={[styles.container]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: COLORS.primary },
          currentIndex === 0 && { backgroundColor: COLORS.primaryLight },
        ]}
        onPress={onPrevious}
        disabled={currentIndex === 0}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            { color: COLORS.text },
            currentIndex === 0 && { color: COLORS.textSub },
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
        minimumTrackTintColor={COLORS.primary}
        maximumTrackTintColor={COLORS.backgroundDark}
        thumbTintColor={COLORS.primary}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: COLORS.primary },
          currentIndex === maxIndex && { backgroundColor: COLORS.primaryLight },
        ]}
        onPress={onNext}
        disabled={currentIndex === maxIndex}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            { color: COLORS.text },
            currentIndex === maxIndex && { color: COLORS.textSub },
          ]}
        >
          ▶
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
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
