import LoadingOverlay from "@/src/components/LoadingOverlay";
import { ICONS } from "@/src/lib/icons";
import { supabase } from "@/src/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SetTutorialCompletedIndexContext,
  TutorialCompletedIndexContext,
  UidContext,
} from "../src/components/UserContexts";
import { useTheme } from "../src/lib/useTheme";

export default function TutorialCompleted() {
  const uid = useContext(UidContext);
  const [loading, setLoading] = useState(false);

  const setTutorialCompletedIndex = useContext(
    SetTutorialCompletedIndexContext,
  );
  const tutorialCompletedIndex = useContext(TutorialCompletedIndexContext);

  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const tutorialIndexParam = Number(params.currentTutorialIndex);

  const handleBackToList = () => {
    router.replace("/TutorialList");
  };

  const handleNextLesson = () => {
    router.replace({
      pathname: "/Tutorial",
      params: { lessonId: tutorialIndexParam + 1 },
    });
  };

  // このページが開かれた瞬間、supabaseに通信して、profiles.tutorial_completed_indexをcurrentTutorialIndexに設定する。
  // また、setTutorialCompletedIndex(currentTutorialIndex)にする
  useEffect(() => {
    if (tutorialIndexParam === null || setTutorialCompletedIndex === null)
      return;

    // 定義部
    const fetchTutorialIndex = async () => {
      setLoading(true);
      // supabaseからユーザーのtutorial_completed_indexを取得
      const { data, error } = await supabase
        .from("profiles")
        .update({ tutorial_completed_index: tutorialIndexParam })
        .eq("uid", uid)
        .select();

      if (error) {
        console.error("Failed to fetch tutorial index:", error);
        setLoading(false);

        return;
      }

      if (data) {
        setTutorialCompletedIndex(tutorialIndexParam); // 状態にセット
        setLoading(false);
      }
    };

    // 処理部
    if (
      tutorialCompletedIndex === null ||
      tutorialCompletedIndex < tutorialIndexParam
    ) {
      fetchTutorialIndex(); // ページ開いた瞬間に呼ぶ
    }
  }, [tutorialIndexParam]); // 空配列で初回マウント時だけ実行

  // 次のレッスンがあるかどうかを判定（必要に応じて調整）
  const hasNextLesson = tutorialIndexParam < 5; // 例: 6レッスンまである場合

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.card}>
          {/* 完了アイコン */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>✓</Text>
            </View>
          </View>

          {/* くまくんキャラクター */}
          <View style={styles.characterContainer}>
            <Image source={ICONS[100]} style={styles.characterImage} />
          </View>

          {/* おめでとうメッセージ */}
          <View style={styles.messageContainer}>
            <Text style={styles.titleText}>レッスン完了！</Text>
            <Text style={styles.descriptionText}>
              よくできました！{"\n"}
              囲碁の基本をマスターしましたね
            </Text>
          </View>

          {/* くまくんの吹き出し */}
          <View style={styles.speechBubble}>
            <View style={styles.bubbleTriangle} />
            <Text style={styles.speechText}>
              素晴らしい！{"\n"}
              この調子で次のレッスンも頑張ろう！
            </Text>
          </View>

          {/* ボタングループ */}
          <View style={styles.buttonGroup}>
            {hasNextLesson && (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleNextLesson}
              >
                <Text style={styles.buttonText}>次のレッスンへ →</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleBackToList}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                レッスン一覧に戻る
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* ← ここがLoadingオーバーレイ */}
      {loading && <LoadingOverlay text="つうしん中..." />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#27ae60",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconText: {
    fontSize: 60,
    color: "#fff",
    fontWeight: "bold",
  },
  characterContainer: {
    marginBottom: 24,
  },
  characterImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  titleText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 24,
  },
  speechBubble: {
    width: "100%",
    backgroundColor: "#e8f4f8",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    position: "relative",
    borderWidth: 2,
    borderColor: "#d4e9f2",
  },
  bubbleTriangle: {
    position: "absolute",
    top: -12,
    left: "50%",
    marginLeft: -10,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#d4e9f2",
  },
  speechText: {
    fontSize: 16,
    color: "#2c3e50",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: "#3498db",
  },
  buttonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#3498db",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  buttonTextSecondary: {
    color: "#3498db",
  },
});
