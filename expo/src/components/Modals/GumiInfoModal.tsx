import { useTranslation } from "@/src/contexts/LocaleContexts";
import { PointsContext } from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import {
  calculateGumiProgress,
  getGumiByIndex,
  GUMI_DATA,
} from "@/src/lib/gumiUtils";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useContext } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  currentGumiIndex: number;
  currentPoints?: number;
};

export default function GumiInfoModal({
  visible,
  onClose,
  currentGumiIndex: currentKumiIndex,
  currentPoints: currentPoints = 0,
}: Props) {
  const { t } = useTranslation();
  const { height, width } = useWindowDimensions();
  const { points, setPoints } = useContext(PointsContext)!;
  const { colors } = useTheme();
  const currentKumi = getGumiByIndex(currentKumiIndex);
  const progressInfo = calculateGumiProgress(
    currentPoints,
    currentKumiIndex,
    t,
  );

  // レート範囲の最小・最大値を計算（0スタート）
  const minPoints = 0;
  const maxPoints = GUMI_DATA[GUMI_DATA.length - 1].minPoints;
  const totalRange = maxPoints - minPoints;

  // 各ぐみのレート幅を計算（0からの位置で計算）
  const getBarWidth = (index: number): number => {
    const currentGumi = GUMI_DATA[index];
    const nextGumi = GUMI_DATA[index + 1];

    if (!nextGumi) {
      // 最後のぐみは残りの範囲全て
      return (currentGumi.minPoints / totalRange) * 100;
    }
    const range = currentGumi.minPoints;

    return (range / totalRange) * 100;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* 背景タップ用 */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* モーダル本体 */}
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              height: height * (84 / 100),
              width: width * (84 / 100),
            },
          ]}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("GumiInfoModal.title")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* 現在のくみ */}
          <View
            style={[styles.currentKumiCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.currentKumiLabel, { color: colors.subtext }]}>
              {t("GumiInfoModal.yourCurrentPoint")}
            </Text>
            <Text
              style={[
                styles.currentKumiName,
                {
                  color:
                    colors[currentKumi.color as keyof typeof colors] ||
                    colors.text,
                },
              ]}
            >
              {points}pt
            </Text>

            {progressInfo.nextGumiName && (
              <Text style={[styles.nextKumiText, { color: colors.subtext }]}>
                {t("GumiInfoModal.remaining", {
                  nextGumi: progressInfo.nextGumiName,
                  points: progressInfo.pointsNeeded,
                })}
              </Text>
            )}
          </View>

          {/* くみ一覧（棒グラフ風） */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
          >
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              {t("GumiInfoModal.allGumi")}
            </Text>

            {GUMI_DATA.map((kumi, index) => {
              const isLocked =
                currentPoints < kumi.minPoints && index > currentKumiIndex;
              const isPast = index < currentKumiIndex;
              const isCurrent = index === currentKumiIndex;
              const barWidth = getBarWidth(index);
              const nextGumi = GUMI_DATA[index + 1];
              const gumiWithName = getGumiByIndex(index);
              const nextGumiWithName = nextGumi
                ? getGumiByIndex(index + 1)
                : null;

              const pointsRange = nextGumiWithName
                ? t("GumiInfoModal.until", {
                    nextGumi: nextGumiWithName.name,
                    points: nextGumi.minPoints - kumi.minPoints,
                  })
                : ``;

              return (
                <View key={index} style={styles.kumiBarContainer}>
                  {/* ぐみ名とアイコン */}
                  <View style={styles.kumiBarHeader}>
                    <View style={styles.kumiBarLeft}>
                      <Text
                        style={[
                          styles.kumiBarName,
                          {
                            color:
                              colors[kumi.color as keyof typeof colors] ||
                              colors.text,
                          },
                          isLocked && { opacity: 0.5 },
                        ]}
                      >
                        {gumiWithName.name}
                      </Text>
                      {isCurrent && (
                        <View
                          style={[
                            styles.currentBadgeSmall,
                            {
                              backgroundColor:
                                colors[kumi.color as keyof typeof colors] ||
                                colors.active,
                            },
                          ]}
                        >
                          <Text style={styles.currentBadgeTextSmall}>
                            {t("GumiInfoModal.current")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.kumiBarRange,
                        { color: colors.subtext },
                        isLocked && { opacity: 0.5 },
                      ]}
                    >
                      {nextGumi
                        ? `${kumi.minPoints} ~ ${nextGumi.minPoints - 1}pt`
                        : `${kumi.minPoints}pt~`}
                    </Text>
                  </View>

                  {/* 棒グラフ（色付き部分のみ） */}
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${barWidth}%`,
                          backgroundColor:
                            colors[kumi.color as keyof typeof colors] ||
                            colors.active,
                        },
                        isLocked && { opacity: 0.3 },
                        isPast && { opacity: 0.6 },
                      ]}
                    ></View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* 説明 */}
          <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.infoText, { color: colors.subtext }]}>
              {t("GumiInfoModal.infoText")}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── LoadingOverlayと同じカラー ─────────────────────── */
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${BACKGROUND}E6`,
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },

  closeButton: {
    padding: 6,
  },

  currentKumiCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
  },

  currentKumiLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 1,
    color: CHOCOLATE_SUB,
  },

  currentKumiName: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 6,
  },

  nextKumiText: {
    fontSize: 14,
    fontWeight: "600",
    color: CHOCOLATE_SUB,
  },

  scrollView: {
    marginBottom: 16,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
    color: CHOCOLATE_SUB,
  },

  kumiBarContainer: {
    marginBottom: 18,
  },

  kumiBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  kumiBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  kumiBarName: {
    fontSize: 14,
    fontWeight: "700",
  },

  kumiBarRange: {
    fontSize: 11,
    fontWeight: "600",
    color: CHOCOLATE_SUB,
  },

  currentBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  currentBadgeTextSmall: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  barContainer: {
    height: 20,
    width: "100%",
    backgroundColor: "rgba(200,214,230,0.15)",
    borderRadius: 10,
    overflow: "hidden",
  },

  barFill: {
    height: 20,
    borderRadius: 10,
  },

  infoBox: {
    padding: 18,
    borderRadius: 18,
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
  },

  infoText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    color: CHOCOLATE_SUB,
  },
});
