import { useTranslation } from "@/src/active/hooks/useTranslation";
import {
  calculateGroupProgress,
  getGroupByIndex,
} from "@/src/active/logics/groupLogics";

import { COLORS } from "@/src/active/constants/colors";
import { BoardSize } from "@/src/stable/types/goTypes";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GROUPS } from "../../constants/groups";
import { useProfile } from "../../contexts/ProfileContexts";

type Props = {
  visible: boolean;
  onClose: () => void;
  currentGroupIndex: number;
  currentPoints?: number;
  boardSize: BoardSize;
};

export default function GroupInfoModal({
  visible,
  onClose,
  currentGroupIndex: currentKumiIndex,
  currentPoints: currentPoints = 0,
  boardSize,
}: Props) {
  const t = useTranslation();
  const { height, width } = useWindowDimensions();
  const { profile } = useProfile();
  const { points9, points13 } = profile;
  const points = boardSize === 9 ? points9 : points13;

  const currentKumi = getGroupByIndex(currentKumiIndex, t);
  const progressInfo = calculateGroupProgress(
    currentPoints,
    currentKumiIndex,
    t,
  );

  // レート範囲の最小・最大値を計算（0スタート）
  const minPoints = 0;
  const maxPoints = GROUPS[GROUPS.length - 1].minPoints;
  const totalRange = maxPoints - minPoints;

  // 各ぐみのレート幅を計算（0からの位置で計算）
  const getBarWidth = (index: number): number => {
    const currentGroup = GROUPS[index];
    const nextGroup = GROUPS[index + 1];

    if (!nextGroup) {
      // 最後のぐみは残りの範囲全て
      return (currentGroup.minPoints / totalRange) * 100;
    }
    const range = currentGroup.minPoints;

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
              height: height * (84 / 100),
              width: width * (84 / 100),
            },
          ]}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {t("GroupInfoModal.title")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* 現在のくみ */}
          <View style={[styles.currentKumiCard]}>
            <Text style={[styles.currentKumiLabel]}>
              {t("GroupInfoModal.yourCurrentPoint")}
            </Text>
            <Text
              style={[
                styles.currentKumiName,
                {
                  color:
                    COLORS[currentKumi.color as keyof typeof COLORS] ||
                    COLORS.text,
                },
              ]}
            >
              {points}pt
            </Text>

            {progressInfo.nextGroupName && (
              <Text style={[styles.nextKumiText, { color: COLORS.textSub }]}>
                {t("GroupInfoModal.remaining", {
                  nextGroup: progressInfo.nextGroupName,
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
            <Text style={[styles.sectionTitle, { color: COLORS.textSub }]}>
              {t("GroupInfoModal.allGroup")}
            </Text>

            {GROUPS.map((kumi, index) => {
              const isLocked =
                currentPoints < kumi.minPoints && index > currentKumiIndex;
              const isPast = index < currentKumiIndex;
              const isCurrent = index === currentKumiIndex;
              const barWidth = getBarWidth(index);
              const nextGroup = GROUPS[index + 1];
              const groupWithName = getGroupByIndex(index, t);

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
                              COLORS[kumi.color as keyof typeof COLORS] ||
                              COLORS.text,
                          },
                          isLocked && { opacity: 0.5 },
                        ]}
                      >
                        {groupWithName.name}
                      </Text>
                      {isCurrent && (
                        <View
                          style={[
                            styles.currentBadgeSmall,
                            {
                              backgroundColor:
                                COLORS[kumi.color as keyof typeof COLORS] ||
                                COLORS.primary,
                            },
                          ]}
                        >
                          <Text style={styles.currentBadgeTextSmall}>
                            {t("GroupInfoModal.current")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.kumiBarRange,
                        { color: COLORS.textSub },
                        isLocked && { opacity: 0.5 },
                      ]}
                    >
                      {nextGroup
                        ? `${kumi.minPoints} ~ ${nextGroup.minPoints - 1}pt`
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
                            COLORS[kumi.color as keyof typeof COLORS] ||
                            COLORS.primary,
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
          <View style={[styles.infoBox]}>
            <Text style={[styles.infoText, { color: COLORS.textSub }]}>
              {t("GroupInfoModal.infoText")}
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
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.backgroundDark,
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
    color: COLORS.text,
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
    backgroundColor: COLORS.foreground,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },

  currentKumiLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 1,
    color: COLORS.textSub,
  },

  currentKumiName: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 6,
  },

  nextKumiText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
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
    color: COLORS.primary,
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
    color: COLORS.primary,
  },

  currentBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  currentBadgeTextSmall: {
    color: COLORS.foreground,
    fontSize: 9,
    fontWeight: "700",
  },

  barContainer: {
    height: 20,
    width: "100%",
    backgroundColor: COLORS.backgroundDark,
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
    backgroundColor: COLORS.foreground,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },

  infoText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    color: COLORS.primary,
  },
});
