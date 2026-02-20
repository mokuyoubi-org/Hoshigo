import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../hooks/useTheme";
import {
  GUMI_DATA,
  calculateGumiProgress,
  getGumiByIndex,
} from "../lib/gumiUtils";

interface GumiInfoModalProps {
  visible: boolean;
  onClose: () => void;
  currentGumiIndex: number;
  currentPoints?: number;
}

export default function GumiInfoModal({
  visible,
  onClose,
  currentGumiIndex: currentKumiIndex,
  currentPoints: currentPoints = 0,
}: GumiInfoModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currentKumi = getGumiByIndex(currentKumiIndex);
  const progressInfo = calculateGumiProgress(currentPoints, currentKumiIndex);

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
            { backgroundColor: colors.background },
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
              {t("GumiInfoModal.yourCurrentGumi")}
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
              {currentKumi.name}
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
                      {isPast && (
                        <MaterialIcons
                          name="check-circle"
                          size={14}
                          color={colors.subtext}
                        />
                      )}
                      {isLocked && (
                        <MaterialIcons
                          name="lock"
                          size={14}
                          color={colors.inactive}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.kumiBarRange,
                        { color: colors.subtext },
                        isLocked && { opacity: 0.5 },
                      ]}
                    >
                      {pointsRange}
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
                        isCurrent && styles.barFillCurrent,
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
    width: Dimensions.get("window").width * 0.9,
    maxWidth: 400,
    maxHeight: Dimensions.get("window").height * 0.8,
    height: 600,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
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

  barFillCurrent: {
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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