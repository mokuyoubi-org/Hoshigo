import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

// 🐱 ② 左右タップ用オーバーレイのコンポーネント（GoBoardの中に閉じ込める）
type ReplayTapOverlayProps = {
  currentIndex: number;
  maxIndex: number;
  onCurrentIndexChange?: (index: number) => void;
};

export function ReplayTapOverlay({
  currentIndex,
  maxIndex,
  onCurrentIndexChange,
}: ReplayTapOverlayProps) {
  if (!onCurrentIndexChange) return null;

  const handleLeftTap = () => {
    onCurrentIndexChange(Math.max(0, currentIndex - 1));
  };

  const handleRightTap = () => {
    onCurrentIndexChange(Math.min(maxIndex, currentIndex + 1));
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.overlayContainer}>
        {/* 左側：1手戻る */}
        <Pressable
          style={styles.tapArea}
          onPress={handleLeftTap}
          focusable={false}
          // @ts-ignore Web用：キーボードフォーカス（Tabキー選択）から外す
          tabIndex={-1}
        />
        {/* 右側：1手進む */}
        <Pressable
          style={styles.tapArea}
          onPress={handleRightTap}
          focusable={false}
          tabIndex={-1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🐱 ④ タップ領域用のスタイルを追加
  overlayContainer: {
    flex: 1,
    flexDirection: "row",
  },
  tapArea: {
    flex: 1,
  },
});
