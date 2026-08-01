import { COLORS } from "@/src/active/constants/colors";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export const SearchingButton = () => {
  const { isMatching, matchingBoardSize, cancelMatching } = useMatching();

  // マッチング中じゃなければ何も表示しない
  if (!isMatching) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.card}>
        {/* くるくるアニメーション */}
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.spinner}
        />

        {/* テキスト表示 */}
        <Text style={styles.text}>
          searching{" "}
          {matchingBoardSize
            ? `${matchingBoardSize}×${matchingBoardSize} `
            : " "}
          ...
        </Text>

        {/* キャンセル（✕）ボタン */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            console.log("🐱 ✕ボタン押された！", new Date().toISOString());
            cancelMatching();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90, // タブバーのすぐ上に浮かせる調整（お好みで調整OK！）
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 99, // 一番手前に表示
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: COLORS.backgroundDark,
  },
  spinner: {
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 12,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
});
