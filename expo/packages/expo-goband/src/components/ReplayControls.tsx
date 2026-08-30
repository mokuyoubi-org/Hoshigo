import Slider from "@react-native-community/slider";
import React, { memo, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/colors"; // 🐱 共通の色定義を使う

type Props = {
  currentIndex: number;
  maxIndex: number;
  onCurrentIndexChange: React.Dispatch<React.SetStateAction<number>>;
};

// 🐱 React.memo で無駄な再描画を防ぐ
export const ReplayControls = memo(function ReplayControls({
  currentIndex,
  maxIndex,
  onCurrentIndexChange,
}: Props) {
  // 🐱 useCallback でボタン処理の関数をキャッシュ！
  const onPrevious = useCallback(() => {
    onCurrentIndexChange((prev) => (prev > 0 ? prev - 1 : prev));
  }, [onCurrentIndexChange]);

  const onNext = useCallback(() => {
    onCurrentIndexChange((prev) => (prev < maxIndex ? prev + 1 : prev));
  }, [maxIndex, onCurrentIndexChange]);

  // 🐱 スライダー変更処理（ドラッグ完了時に更新するとより軽くなる）
  const onSliderChange = useCallback(
    (value: number) => {
      onCurrentIndexChange(Math.round(value));
    },
    [onCurrentIndexChange],
  );

  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === maxIndex;
  const isSliderDisabled = maxIndex === 0;

  return (
    <View style={styles.container}>
      {/* 前へボタン */}
      <TouchableOpacity
        style={[styles.button, { opacity: isAtStart ? 0.5 : 1.0 }]}
        onPress={onPrevious}
        disabled={isAtStart}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>◀</Text>
      </TouchableOpacity>

      {/* スライダー */}
      <Slider
        style={[styles.slider, { opacity: isSliderDisabled ? 0.5 : 1.0 }]}
        disabled={isSliderDisabled}
        minimumValue={0}
        maximumValue={maxIndex}
        step={1}
        value={currentIndex}
        onValueChange={onSliderChange} // リアルタイム反映
        // onSlidingComplete={onSliderChange} // ← もしスライダー移動中も重いと感じたらこちらに切り替えると超軽量になる
        minimumTrackTintColor={COLORS.primary}
        maximumTrackTintColor={COLORS.backgroundDark ?? "#e1e8ed"}
        thumbTintColor={COLORS.primary}
      />

      {/* 次へボタン */}
      <TouchableOpacity
        style={[styles.button, { opacity: isAtEnd ? 0.5 : 1.0 }]}
        onPress={onNext}
        disabled={isAtEnd}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 24,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: COLORS.darkObject, // 🐱 文字色も共通定数に合わせると統一感が出る
  },
  slider: {
    flex: 1,
    height: 40,
  },
});
