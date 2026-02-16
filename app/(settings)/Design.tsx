import { useRouter } from "expo-router";
import React, { useContext } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SetThemeContext } from "../../src/components/UserContexts";
import { THEME_COLORS, ThemeType } from "../../src/constants/colors";
import { useTheme } from "../../src/hooks/useTheme";
import { themeStore } from "../../src/services/storage";

export default function Design() {
  const { theme, colors: currentColors } = useTheme();
  const setTheme = useContext(SetThemeContext);
  const router = useRouter();

  const handleThemeChange = async (newTheme: ThemeType) => {
    if (setTheme === null) return;

    setTheme(newTheme);
    await themeStore.set(newTheme);
  };

  // 碁盤のグリッドを描画するコンポーネント（5路盤）
  const GobanPreview = ({ themeType }: { themeType: ThemeType }) => {
    const themeColors = THEME_COLORS[themeType];
    const boardSize = 140;
    const cellSize = boardSize / 4;

    const sampleStones = [
      { row: 2, col: 2, color: "black" },
      { row: 4, col: 4, color: "white" },
    ];

    return (
      <View
        style={[
          styles.gobanContainer,
          {
            backgroundColor: themeColors.gridBackground,
            borderColor: themeColors.borderColor,
          },
        ]}
      >
        <View
          style={[styles.gobanWrapper, { width: boardSize, height: boardSize }]}
        >
          {/* 縦線 */}
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={`v-${i}`}
              style={[
                styles.verticalLine,
                {
                  left: i * cellSize,
                  height: boardSize,
                  backgroundColor: themeColors.gridLine,
                },
              ]}
            />
          ))}
          {/* 横線 */}
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={`h-${i}`}
              style={[
                styles.horizontalLine,
                {
                  top: i * cellSize,
                  width: boardSize,
                  backgroundColor: themeColors.gridLine,
                },
              ]}
            />
          ))}

          {/* サンプルの石 */}
          {sampleStones.map((stone, index) => (
            <View
              key={index}
              style={[
                styles.previewStone,
                {
                  left: (stone.col - 1) * cellSize,
                  top: (stone.row - 1) * cellSize,
                },
              ]}
            >
              <View
                style={[
                  styles.stoneCircle,
                  stone.color === "black"
                    ? styles.blackStone
                    : styles.whiteStone,
                ]}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currentColors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[styles.backButtonText, { color: currentColors.active }]}
            >
              ← 戻る
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentColors.text }]}>
            テーマ設定
          </Text>
        </View>

        {/* 碁盤テーマセクション */}
        <View style={styles.section}>
          <View style={styles.gridContainer}>
            {(Object.keys(THEME_COLORS) as ThemeType[]).map((themeKey) => {
              const labels: Record<ThemeType, string> = {
                standard: "スタンダード",
                light: "ライト",
                dark: "ダーク",
              };

              const isSelected = theme === themeKey;

              return (
                <TouchableOpacity
                  key={themeKey}
                  style={[
                    styles.optionCard,
                    { backgroundColor: currentColors.card },
                    isSelected && {
                      borderColor: currentColors.active,
                      borderWidth: 3,
                      transform: [{ scale: 1.02 }],
                    },
                  ]}
                  onPress={() => handleThemeChange(themeKey)}
                  activeOpacity={0.7}
                >
                  <GobanPreview themeType={themeKey} />

                  <View style={styles.cardContent}>
                    <Text
                      style={[styles.optionText, { color: currentColors.text }]}
                    >
                      {labels[themeKey]}
                    </Text>
                  </View>

                  {isSelected && (
                    <View
                      style={[
                        styles.selectedBadge,
                        { backgroundColor: currentColors.active },
                      ]}
                    >
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  gridContainer: {
    gap: 20,
  },
  optionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gobanContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  gobanWrapper: {
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    width: 1.5,
  },
  horizontalLine: {
    position: "absolute",
    height: 1.5,
  },
  previewStone: {
    position: "absolute",
    width: 35,
    height: 35,
    marginLeft: -17.5,
    marginTop: -17.5,
    justifyContent: "center",
    alignItems: "center",
  },
  stoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  blackStone: {
    backgroundColor: "#2d3748",
  },
  whiteStone: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardContent: {
    alignItems: "center",
    gap: 4,
  },
  optionText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  selectedBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedBadgeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoSection: {
    marginTop: 16,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
