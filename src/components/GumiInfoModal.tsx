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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    width: Dimensions.get("window").width * 0.9,
    maxWidth: 400,
    maxHeight: Dimensions.get("window").height * 0.8,
    height: 600,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  currentKumiCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  currentKumiLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currentKumiName: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  nextKumiText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    marginBottom: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  scaleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scaleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  kumiBarContainer: {
    marginBottom: 16,
  },
  kumiBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kumiBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  kumiBarName: {
    fontSize: 14,
    fontWeight: "600",
  },
  kumiBarRange: {
    fontSize: 11,
    fontWeight: "500",
  },
  currentBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeTextSmall: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  barContainer: {
    height: 24,
    width: "100%",
  },
  barFill: {
    height: 24,
    borderRadius: 8,
    position: "relative",
  },
  barFillCurrent: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});
