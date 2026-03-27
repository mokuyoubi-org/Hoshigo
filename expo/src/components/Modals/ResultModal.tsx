import { useTranslation } from "@/src/contexts/LocaleContexts";
import { GumiIndexContext } from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { calculateGumiProgress, getGumiByIndex } from "@/src/lib/gumiUtils";
import { useStartMatching } from "@/src/lib/matchUtils";
import { pointsToWins, SetState } from "@/src/lib/utils";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  resultComment: string;
  onPressOK: () => void;
  pointsBefore: number;
  pointsAfter: number;
  gumiIndexBefore: number;
  gumiIndexAfter: number;
  setLoading: SetState<boolean>;
  setIsDailyLimitReached: SetState<boolean>;
};

export function ResultModal({
  visible,
  resultComment,
  onPressOK,
  pointsBefore: pointsBefore,
  pointsAfter: pointsAfter,
  gumiIndexBefore,
  gumiIndexAfter,
  setLoading,
  setIsDailyLimitReached,
}: Props) {
  const startMatching = useStartMatching();
  const { t, lang } = useTranslation();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const { gumiIndex, setGumiIndex } = useContext(GumiIndexContext)!;
  const currentGumi = getGumiByIndex(gumiIndex || 0);
  const { colors } = useTheme();
  const gumiColor =
    colors[currentGumi.color as keyof typeof colors] || colors.text;
  const [isGumiNew, setIsGumiNew] = useState(false);

  useEffect(() => {
    console.log("pointsBefore:", pointsBefore);
    console.log("pointsAfter:", pointsAfter);
    console.log("gumiIndexBefore:", gumiIndexBefore);
    console.log("gumiIndexAfter:", gumiIndexAfter);
    console.log("visible:", visible);
    if (!visible) {
      hasAnimated.current = false;
      return;
    }

    // 既にアニメーション済みの場合はスキップ
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // 昇格したかどうかをチェック
    const gumiTransition = gumiIndexAfter !== gumiIndexBefore;

    // 昇格した場合のアニメーション
    if (gumiTransition) {
      setIsGumiNew(false);
      // 昇格の場合：現在の進捗 → 100% → ぐみ変更 → 0% → 新しい進捗
      const beforeProgress = calculateGumiProgress(
        pointsBefore,
        gumiIndexBefore,
        t,
      );
      const afterProgress = calculateGumiProgress(
        pointsAfter,
        gumiIndexAfter,
        t,
      );

      // まず現在のぐみインデックスをセット
      progressAnim.setValue(beforeProgress.progressPercent); // 今のパーセント

      // ステップ1: 100%まで上げる
      Animated.timing(progressAnim, {
        toValue: gumiIndexAfter > gumiIndexBefore ? 100 : 0, // 昇格なら100%に、降格なら0%にする
        duration: 600, // 0.6秒かける
        useNativeDriver: false,
      }).start(() => {
        setIsGumiNew(true);

        // ステップ2: ぐみを変更して0%にリセット
        progressAnim.setValue(gumiIndexAfter > gumiIndexBefore ? 0 : 100); // 昇格なら0%に、降格なら100%にする

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
      const beforeProgress = calculateGumiProgress(
        pointsBefore,
        gumiIndexBefore,
        t,
      );
      const afterProgress = calculateGumiProgress(
        pointsAfter,
        gumiIndexAfter,
        t,
      );

      progressAnim.setValue(beforeProgress.progressPercent);

      Animated.timing(progressAnim, {
        toValue: afterProgress.progressPercent,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, pointsBefore, pointsAfter, gumiIndexBefore, gumiIndexAfter]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // 表示するくみ名を取得（翻訳済み）
  const displayGumiName = isGumiNew
    ? getGumiByIndex(gumiIndexAfter).name
    : getGumiByIndex(gumiIndexBefore).name;

  // 次のくみ名を取得（翻訳済み）
  const nextGumiName =
    gumiIndex !== null && gumiIndex < 17
      ? getGumiByIndex(gumiIndex + 1).name
      : null;

  const pointsNeeded = calculateGumiProgress(
    pointsAfter,
    gumiIndex ?? 0,
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

            <Text style={[styles.gumiName, { color: gumiColor }]}>
              {displayGumiName}
            </Text>

            {/* ゲージ */}
            <View style={styles.progressBarBg}>
              {/* 中身 */}
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: gumiColor, width: animatedWidth },
                ]}
              />
            </View>

            {nextGumiName && (
              <Text style={styles.gaugeText}>
                {t("ResultModal.remaining", {
                  nextGumi: nextGumiName,
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
                <MaterialIcons name="home" size={24} color="#333" />
                <Text style={styles.buttonText}>{t("ResultModal.home")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  startMatching(setLoading, setIsDailyLimitReached);
                }}
              >
                <MaterialIcons name="refresh" size={24} color="#333" />
                <Text style={styles.buttonText}>
                  {t("ResultModal.playAgain")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.okButton, { backgroundColor: gumiColor }]}
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  resultCard: {
    width: "85%",
    backgroundColor: "#fff",
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
  gumiName: {
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
    backgroundColor: "rgba(200,214,230,0.2)",
    overflow: "hidden",
    position: "relative",
  },
  gaugeText: {
    marginTop: 8,
    fontWeight: "600",
    color: "#666",
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
    color: "#fff",
    fontWeight: "bold",
  },
  // 対局制限モーダル専用スタイル
  limitModalContent: {
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  limitModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  limitModalIconText: {
    fontSize: 40,
  },
  limitModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  limitModalMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  limitModalButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  limitModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
