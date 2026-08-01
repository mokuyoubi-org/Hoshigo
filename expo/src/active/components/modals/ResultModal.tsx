import { useTranslation } from "@/src/active/hooks/useTranslation";
import {
  calculateGroupProgress,
  getGroupByIndex,
} from "@/src/active/logics/groupLogics";

import { COLORS } from "@/src/active/constants/colors";
import { pointsToWins } from "@/src/active/logics/utilLogics";
import { BoardSize } from "@/src/stable/types/goTypes";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLang } from "../../contexts/LangContext";
import { useMatching } from "../../contexts/MatchingContext";
import { useProfile } from "../../contexts/ProfileContexts";
import { SetState } from "../../types/commonTypes";

type Props = {
  visible: boolean;
  resultComment: string;
  onPressOK: () => void;
  pointsBefore: number;
  pointsAfter: number;
  groupIndexBefore: number;
  groupIndexAfter: number;
  setLoading: SetState<boolean>;
  boardSize: BoardSize;
};

export function ResultModal({
  boardSize,
  visible,
  resultComment,
  onPressOK,
  pointsBefore: pointsBefore,
  pointsAfter: pointsAfter,
  groupIndexBefore,
  groupIndexAfter,
  setLoading,
}: Props) {
  const { startMatching } = useMatching();
  const t = useTranslation();
  const { lang } = useLang();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const { profile } = useProfile();
  const { groupIndex9, groupIndex13 } = profile;
  const groupIndex = boardSize === 9 ? groupIndex9 : groupIndex13;
  const currentGroup = getGroupByIndex(groupIndex || 0, t);

  const groupColor =
    COLORS[currentGroup.color as keyof typeof COLORS] || COLORS.text;
  const [isGroupNew, setIsGroupNew] = useState(false);

  useEffect(() => {
    if (!visible) {
      hasAnimated.current = false;
      return;
    }

    // 既にアニメーション済みの場合はスキップ
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // 昇格したかどうかをチェック
    const groupTransition = groupIndexAfter !== groupIndexBefore;

    // 昇格した場合のアニメーション
    if (groupTransition) {
      setIsGroupNew(false);
      // 昇格の場合：現在の進捗 → 100% → ぐみ変更 → 0% → 新しい進捗
      const beforeProgress = calculateGroupProgress(
        pointsBefore,
        groupIndexBefore,
        t,
      );
      const afterProgress = calculateGroupProgress(
        pointsAfter,
        groupIndexAfter,
        t,
      );

      // まず現在のぐみインデックスをセット
      progressAnim.setValue(beforeProgress.progressPercent); // 今のパーセント

      // ステップ1: 100%まで上げる
      Animated.timing(progressAnim, {
        toValue: groupIndexAfter > groupIndexBefore ? 100 : 0, // 昇格なら100%に、降格なら0%にする
        duration: 600, // 0.6秒かける
        useNativeDriver: false,
      }).start(() => {
        setIsGroupNew(true);

        // ステップ2: ぐみを変更して0%にリセット
        progressAnim.setValue(groupIndexAfter > groupIndexBefore ? 0 : 100); // 昇格なら0%に、降格なら100%にする

        // ステップ3: 新しい進捗まで上げる
        setTimeout(() => {
          Animated.timing(progressAnim, {
            toValue: afterProgress.progressPercent, // 新しいパーセントにする
            duration: 600,
            useNativeDriver: false,
          }).start();
        }, 100);
      });
    } else {
      // 昇格していない場合：現在の進捗から新しい進捗へ直接アニメーション
      const beforeProgress = calculateGroupProgress(
        pointsBefore,
        groupIndexBefore,
        t,
      );
      const afterProgress = calculateGroupProgress(
        pointsAfter,
        groupIndexAfter,
        t,
      );

      progressAnim.setValue(beforeProgress.progressPercent);

      Animated.timing(progressAnim, {
        toValue: afterProgress.progressPercent,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]); // このvisibleは外さない

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // 表示するくみ名を取得（翻訳済み）
  const displayGroupName = isGroupNew
    ? getGroupByIndex(groupIndexAfter, t).name
    : getGroupByIndex(groupIndexBefore, t).name;

  // 次のくみ名を取得（翻訳済み）
  const nextGroupName =
    groupIndex !== null && groupIndex < 17
      ? getGroupByIndex(groupIndex + 1, t).name
      : null;

  const pointsNeeded = calculateGroupProgress(
    pointsAfter,
    groupIndex ?? 0,
    t,
  ).pointsNeeded;

  const winsNeeded = pointsToWins(pointsNeeded);

  const winText = lang === "en" ? (winsNeeded === 1 ? "win" : "wins") : ""; // 他言語は空でOK

  return (
    <View>
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t("common.matchComplete")}</Text>
            <Text style={styles.resultComment}>{resultComment}</Text>

            <Text style={[styles.groupName, { color: groupColor }]}>
              {displayGroupName}
            </Text>

            {/* ゲージ */}
            <View style={styles.progressBarBg}>
              {/* 中身 */}
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: groupColor, width: animatedWidth },
                ]}
              />
            </View>

            {nextGroupName && (
              <Text style={styles.gaugeText}>
                {t("ResultModal.remaining", {
                  nextGroup: nextGroupName,
                  wins: winsNeeded,
                  winText: winText,
                })}
              </Text>
            )}

            {/* ボタン群 */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.replace("/Home")}
              >
                <MaterialIcons name="home" size={24} color={COLORS.textSub} />
                <Text style={styles.buttonText}>{t("ResultModal.home")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  startMatching(boardSize);
                }}
              >
                <MaterialIcons
                  name="refresh"
                  size={24}
                  color={COLORS.textSub}
                />
                <Text style={styles.buttonText}>
                  {t("ResultModal.playAgain")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.okButton, { backgroundColor: groupColor }]}
                onPress={onPressOK}
              >
                <Text style={styles.okButtonText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  resultCard: {
    width: "85%",
    backgroundColor: COLORS.foreground,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  resultComment: {
    marginVertical: 12,
    textAlign: "center",
  },
  groupName: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 20,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 24,
  },
  progressBarBg: {
    width: "100%",
    height: 24,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    overflow: "hidden",
    position: "relative",
  },
  gaugeText: {
    marginTop: 8,
    fontWeight: "600",
    color: COLORS.text,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 24,
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    alignItems: "center",
  },
  buttonText: {
    fontSize: 12,
    marginTop: 4,
  },
  okButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  okButtonText: {
    color: COLORS.foreground,
    fontWeight: "bold",
  },
});
