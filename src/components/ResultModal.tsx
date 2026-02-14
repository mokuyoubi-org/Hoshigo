import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GumiIndexContext,
  IsPremiumContext,
  UidContext,
} from "../../src/components/UserContexts";
import { useTheme } from "../../src/lib/useTheme";
import {
  calculateGumiProgress,
  getGumiByIndex,
  howManyPointsLeft,
} from "../lib/gumiUtils";
import { supabase } from "../lib/supabase";
import { DailyLimitModal } from "./DailyLimitModal";
import LoadingOverlay from "./LoadingOverlay";

interface ResultModalProps {
  visible: boolean;
  resultComment: string;
  onPressOK: () => void;
  pointsBefore: number;
  pointsAfter: number;
  gumiIndexBefore: number;
  gumiIndexAfter: number;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  visible,
  resultComment,
  onPressOK,
  pointsBefore: pointsBefore,
  pointsAfter: pointsAfter,
  gumiIndexBefore,
  gumiIndexAfter,
}) => {
  const { t } = useTranslation();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const uid = useContext(UidContext);
  const isPremium = useContext(IsPremiumContext);
  const gumiIndex = useContext(GumiIndexContext);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isGumiNew, setIsGumiNew] = useState(false);

  useEffect(() => {
    console.log("resultComment: ", resultComment);
    console.log("pointsBefore: ", pointsBefore);
    console.log("pointsAfter: ", pointsAfter);
    console.log("gumiIndexBefore: ", gumiIndexBefore);
    console.log("gumiIndexAfter: ", gumiIndexAfter);

    if (!visible) {
      hasAnimated.current = false;
      return;
    }

    // 既にアニメーション済みの場合はスキップ
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // 昇格したかどうかをチェック
    const isPromotion = gumiIndexAfter > gumiIndexBefore;

    // 昇格した場合のアニメーション
    if (isPromotion) {
      setIsGumiNew(false);
      // 昇格の場合：現在の進捗 → 100% → ぐみ変更 → 0% → 新しい進捗
      const beforeProgress = calculateGumiProgress(
        pointsBefore,
        gumiIndexBefore,
      );
      const afterProgress = calculateGumiProgress(pointsAfter, gumiIndexAfter);
      console.log("昇格！！");
      console.log("元々の%: ", beforeProgress.progressPercent);
      console.log("元々のレート: ", pointsBefore);
      console.log("元々のぐみインデックス: ", gumiIndexBefore);
      console.log("新しい%: ", afterProgress.progressPercent);
      console.log("新しいレート: ", pointsAfter);
      console.log("新しいぐみインデックス: ", gumiIndexAfter);

      // まず現在のぐみインデックスをセット
      progressAnim.setValue(beforeProgress.progressPercent); // 今のパーセント

      // ステップ1: 100%まで上げる
      Animated.timing(progressAnim, {
        toValue: 100, // 100パーセントにする
        duration: 600, // 0.6秒かける
        useNativeDriver: false,
      }).start(() => {
        setIsGumiNew(true);

        // ステップ2: ぐみを変更して0%にリセット
        progressAnim.setValue(0); // 0%にする

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
      );
      const afterProgress = calculateGumiProgress(pointsAfter, gumiIndexAfter);
      console.log("昇格せず");
      console.log("元々の%: ", beforeProgress.progressPercent);
      console.log("元々のレート: ", pointsBefore);
      console.log("元々のぐみインデックス: ", gumiIndexBefore);
      console.log("新しい%: ", afterProgress.progressPercent);
      console.log("新しいレート: ", pointsAfter);
      console.log("新しいぐみインデックス: ", gumiIndexAfter);

      progressAnim.setValue(beforeProgress.progressPercent);

      Animated.timing(progressAnim, {
        toValue: afterProgress.progressPercent,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, pointsBefore, pointsAfter, gumiIndexBefore, gumiIndexAfter]);

  const startMatching = async () => {
    if (!uid) {
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("daily_play_count")
        .eq("uid", uid)
        .single();
      setLoading(false);

      if (error) {
        console.error("Error fetching daily play count:", error);
        return;
      }

      if (data.daily_play_count >= 10 && !isPremium) {
        setIsDailyLimitReached(true);
        return;
      }

      router.replace("/Matching");
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

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

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t("ResultModal.title")}</Text>
            <Text style={styles.resultComment}>{resultComment}</Text>

            <Text style={styles.kumiName}>{displayGumiName}</Text>

            {/* ゲージ */}
            <View style={styles.gaugeBackground}>
              <Animated.View
                style={[styles.gaugeFill, { width: animatedWidth }]}
              />
            </View>

            {nextGumiName && (
              <Text style={styles.gaugeText}>
                {t("ResultModal.remaining", {
                  nextGumi: nextGumiName,
                  points: howManyPointsLeft(pointsAfter, gumiIndex ?? 0),
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
                onPress={startMatching}
              >
                <MaterialIcons name="refresh" size={24} color="#333" />
                <Text style={styles.buttonText}>
                  {t("ResultModal.playAgain")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.okButton} onPress={onPressOK}>
                <Text style={styles.okButtonText}>{t("ResultModal.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 対局制限モーダル */}
      <DailyLimitModal
        visible={isDailyLimitReached}
        onClose={() => setIsDailyLimitReached(false)}
        colors={colors}
        dailyLimit={10}
      />

      {/* ローディングオーバーレイ */}
      {loading && <LoadingOverlay text={t("ResultModal.loading")} />}
    </>
  );
};

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
  kumiName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  gaugeBackground: {
    width: "100%",
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 16,
  },
  gaugeFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
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
    backgroundColor: "#4CAF50",
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  limitModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
