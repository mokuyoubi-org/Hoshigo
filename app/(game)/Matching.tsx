import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingOverlay from "../../src/components/LoadingOverlay";
import {
  DisplayNameContext,
  GamesContext,
  GumiIndexContext,
  IconIndexContext,
  PointsContext,
  UidContext,
  UserNameContext,
} from "../../src/components/UserContexts";
import { supabase } from "../../src/services/supabase";

// カラム数23
type Match = {
  id: string; // 対局自体のid。supabaseが設定
  black_uid: string; // 黒のuid
  white_uid: string | null; // 白のuid
  created_at: string; // supabaseが設定
  status: "waiting" | "playing" | "ended"; // 相手待ちか、対局中か、終局後か
  black_last_seen: string | null; // 黒の最後のハートビート。RPCが使う
  white_last_seen: string | null; // 白の最後のハートビート。RPCが使う
  black_points: number; // 黒のレート。int2。RPCが使う
  white_points: number; // 白のレート。int2。RPCが使う
  result: string | null; // 結果
  black_username: string; // 黒の表示名
  white_username: string | null; // 白の表示名
  black_displayname: string; // 黒の表示名
  white_displayname: string | null; // 白の表示名
  moves: number[]; // 一連の手
  dead_stones: number[]; // 死に石
  turn: "black" | "white"; // 今黒番か白番か
  turn_switched_at: string | null; // 最後に手番が交代した時刻。
  black_remain_seconds: number; // 0~180。黒の残り時間
  white_remain_seconds: number; // 0~180。白の残り時間
  black_icon_index: number; // 黒のアイコン。int2
  white_icon_index: number; // 黒のアイコン。int2
  black_games: number; // 黒のアイコン。int2
  white_games: number; // 黒のアイコン。int2
};

// カラム数15(圧縮せず14/圧縮済み1)
type MatchArchive = {
  id: string; // 対局自体のid。supabaseが設定。Matchと同じものを使う
  black_uid: string; // 黒のuid
  white_uid: string | null; // 白のuid
  created_at: string; // supabaseが設定
  black_points: number; // 黒のレート。対局とかのランキングで使う可能性あり。△
  white_points: number; // 白のレート。対局とかのランキングで使う可能性あり。△
  black_username: string; // 黒の表示名
  white_username: string | null; // 白の表示名
  black_displayname: string; // 黒の表示名
  white_displayname: string | null; // 白の表示名
  black_icon_index: number; // 黒のアイコン。int2。△
  white_icon_index: number; // 黒のアイコン。int2。△
  result: string | null; // 結果。△
  moves: number[];
  dead_stones: number[]; // 一連の手。検索に使うことはない
};

// 囲碁のシーケンス(黒スタート)
const boardSequence = [
  [
    ["●", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
  ],
  [
    ["●", "○", "."],
    [".", ".", "."],
    [".", ".", "."],
  ],
  [
    ["●", "○", "●"],
    [".", ".", "."],
    [".", ".", "."],
  ],
  [
    [".", "○", "●"],
    ["○", ".", "."],
    [".", ".", "."],
  ],
  [
    [".", "○", "●"],
    ["○", "●", "."],
    [".", ".", "."],
  ],
  [
    [".", "○", "."],
    ["○", "●", "○"],
    [".", ".", "."],
  ],
  [
    [".", "○", "."],
    ["○", "●", "○"],
    ["●", ".", "."],
  ],
  [
    [".", "○", "."],
    ["○", ".", "○"],
    [".", "○", "."],
  ],
  [
    [".", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
  ],
];

export default function Matching() {
  const { t } = useTranslation();
  const uid = useContext(UidContext);
  const username = useContext(UserNameContext);
  const displayname = useContext(DisplayNameContext);
  const points = useContext(PointsContext);
  const iconIndex = useContext(IconIndexContext);
  const gumiIndex = useContext(GumiIndexContext);
  const games = useContext(GamesContext);
  //
  const matchIdRef = useRef<string | null>(null);
  const pointsDiffRef = useRef(50);
  const spreadPointsRef = useRef<boolean>(false);
  const matchingTimersRef = useRef<number[]>([]);

  // const [dots, setDots] = useState("");
  const [boardState, setBoardState] = useState<string[][]>([
    [".", ".", "."],
    [".", ".", "."],
    [".", ".", "."],
  ]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribingRef = useRef(false);
  const isTryingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const isCancelingRef = useRef<boolean>(false);

  useEffect(() => {
    // router.replace({ pathname: "/PlayWithBot" });

    startMatching();
    startBoardAnimation();
    return () => {
      stopMatchingLoop();
    };
  }, []);

  const startBoardAnimation = () => {
    let stepIndex = 0;

    const boardInterval = setInterval(() => {
      setBoardState(boardSequence[stepIndex]);

      stepIndex++;

      if (stepIndex >= boardSequence.length) {
        stepIndex = 0;
      }
    }, 1000);

    return () => clearInterval(boardInterval);
  };

  // const fallbackCancel = async () => {
  //   if (channelRef.current) {
  //     await supabase.removeChannel(channelRef.current);
  //     channelRef.current = null;
  //   }

  //   const { data, error } = await supabase.rpc("cancel_match", {
  //     p_uid: uid,
  //   });

  //   if (error) {
  //     console.error("cancel_match RPCエラー", error);
  //     throw error; // ← これ必須!
  //   }

  //   if (data) {
  //     console.log("キャンセル成功");
  //   } else {
  //     console.log("キャンセル対象なし");
  //   }

  //   matchIdRef.current = null;
  // };

  const fallbackCancel = async (): Promise<boolean> => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const { data, error } = await supabase.rpc("cancel_match", {
      p_uid: uid,
    });

    if (error) {
      console.error("cancel_match RPCエラー", error);
      throw error;
    }

    if (data) {
      console.log("キャンセル成功");
    } else {
      console.log("すでにマッチ済みのためキャンセル不可"); // ← 状態がplaying
    }

    matchIdRef.current = null;

    return data === true; // ★ ここ重要
  };

  // const onCancel = async () => {
  //   if (isCancelingRef.current) return;

  //   isCancelingRef.current = true;

  //   try {
  //     setLoading(true);

  //     await fallbackCancel();

  //     router.replace({ pathname: "/Home" });
  //   } finally {
  //     stopMatchingLoop();

  //     setLoading(false);
  //     isCancelingRef.current = false;
  //   }
  // };
  const onCancel = async () => {
    if (isCancelingRef.current) return;

    isCancelingRef.current = true;

    try {
      setLoading(true);

      const canceled = await fallbackCancel(); // ★ 結果を受け取る

      if (canceled) {
        router.replace({ pathname: "/Home" }); // ★ true のときだけ遷移
      } else {
        console.log("対局が成立しているため遷移しません");
        return; // ★ falseならその場に留まる
      }
    } finally {
      stopMatchingLoop();
      setLoading(false);
      isCancelingRef.current = false;
    }
  };

  const startMatching = () => {
    spreadPointsRef.current = true;

    // タイマーIDを保存する配列
    const timers: number[] = [];

    // 最初の5秒間: 1秒ごとにマッチング試行
    tryMatch(); // 即座に1回目
    timers.push(setTimeout(() => tryMatch(), 1000));
    timers.push(setTimeout(() => tryMatch(), 2000));
    timers.push(setTimeout(() => tryMatch(), 4000));
    timers.push(setTimeout(() => tryMatch(), 8000));

    timers.push(
      setTimeout(async () => {
        if (isCancelingRef.current) return;
        isCancelingRef.current = true;

        try {
          await fallbackCancel(); // エラーがあれば throw される
          console.log("✅ キャンセル完了、PlayWithBotへ遷移");
          router.replace({ pathname: "/PlayWithBot" });
        } catch (error) {
          console.error("キャンセル失敗:", error);
          // エラー時は Home に戻る
          router.replace({ pathname: "/Home" });
        } finally {
          stopMatchingLoop();

          isCancelingRef.current = false;
        }
      }, 12000),
    );

    // タイマーをrefに保存
    matchingTimersRef.current = timers;
  };

  const tryMatch = async () => {
    console.log("pointsDiffRef.current: ", pointsDiffRef.current);
    if (isTryingRef.current) {
      return;
    }
    isTryingRef.current = true;

    try {
      const { data, error } = await supabase.rpc("try_match", {
        p_uid: uid,
        p_username: username,
        p_displayname: displayname,
        p_points: points,
        p_points_diff: pointsDiffRef.current,
        p_icon_index: iconIndex,
        p_gumi_index: gumiIndex,
        p_games: games,
      });

      if (error) {
        console.error("RPCエラー", error);
        return;
      }

      const res = data[0];
      if (!res) {
        console.log("RPCから送られてきたデータはありません");
        return;
      }

      matchIdRef.current = res.match_idr;

      if (res.statusr === "playing" && res.roler === "white") {
        console.log("対局が見つかり、白で参加。res.match_idr: ", res.match_idr);
        goToPlaying(
          res.match_idr,
          res.roler === "white" ? "white" : "black",
          res.opponents_usernamer,
          res.opponents_displaynamer,
          res.opponents_pointsr,
          res.opponents_icon_indexr,
          res.opponents_gumi_indexr,
          res.opponents_gamesr,
        );
      } else if (res.statusr === "playing" && res.roler === "black") {
        console.log(
          "subscribeの取り逃しがあったよ。急いでplayingへ行かなきゃ!マッチ: ",
          res.match_idr,
        );
        goToPlaying(
          res.match_idr,
          res.roler === "white" ? "white" : "black",
          res.opponents_usernamer,
          res.opponents_displaynamer,
          res.opponents_pointsr,
          res.opponents_icon_indexr,
          res.opponents_gumi_indexr,
          res.opponents_gamesr,
        );
      } else if (res.statusr === "waiting" && res.roler === "black") {
        if (!isSubscribingRef.current) {
          console.log("黒で対局を作成。subscribe開始。マッチ: ", res.match_idr);
          subscribeMatch(res.match_idr);
          isSubscribingRef.current = true;
        } else {
          console.log(
            "黒で、さっき作った対局で人が来るのを待ってます。マッチ: ",
            res.match_idr,
          );
        }

        if (spreadPointsRef.current)
          pointsDiffRef.current = Math.min(
            Math.floor(pointsDiffRef.current * 1.5),
            300, // 大事。
          );
      }
    } finally {
      isTryingRef.current = false;
    }
  };

  const stopMatchingLoop = () => {
    // 既存のintervalをクリア
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 全てのsetTimeoutタイマーをクリア
    if (matchingTimersRef.current) {
      matchingTimersRef.current.forEach((timer) => clearTimeout(timer));
      matchingTimersRef.current = [];
    }
  };

  const goToPlaying = (
    id: string,
    color: "black" | "white",
    opponentsUserName: string,
    opponentsDisplayName: string,
    opponentsPoints: string,
    opponentsIconIndex: number,
    opponentsGumiIndex: number,
    opponentsGames: number,
  ) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    stopMatchingLoop();
    router.replace({
      pathname: "/Playing",
      params: {
        matchId: id,
        color,
        opponentsUserName,
        opponentsDisplayName,
        opponentsPoints,
        opponentsIconIndex,
        opponentsGumiIndex,
        opponentsGames,
      },
    });
  };

  const subscribeMatch = (id: string) => {
    channelRef.current = supabase
      .channel(`match-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new.status === "playing") {
            console.log("黒で参加。マッチのid: ", id);
            goToPlaying(
              id,
              "black",
              payload.new.white_username,
              payload.new.white_displayname,
              payload.new.white_points,
              payload.new.white_icon_index,
              payload.new.white_gumi_index,
              payload.new.white_games,
            );
          }
        },
      )
      .subscribe();
  };

  const renderStone = (value: string) => {
    if (value === "●") {
      return <View style={styles.blackStone} />;
    } else if (value === "○") {
      return <View style={styles.whiteStone} />;
    } else {
      return <View style={styles.emptyPoint} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {/* 囲碁盤 */}
        {/* <View style={styles.boardContainer}> */}
        {boardState.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.boardRow}>
            {row.map((cell, colIndex) => (
              <View key={`${rowIndex}-${colIndex}`} style={styles.boardCell}>
                {renderStone(cell)}
                {/* 碁盤の線 */}
                {rowIndex < 2 && <View style={styles.verticalLine} />}
                {colIndex < 2 && <View style={styles.horizontalLine} />}
              </View>
            ))}
          </View>
        ))}
        {/* </View> */}

        {/* メッセージ */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>{t("Matching.title")}</Text>
          {/* <View style={styles.dotsContainer}>
            <Text style={styles.dots}>{dots}</Text>
          </View> */}
        </View>

        {/* キャンセルボタン */}
        <TouchableOpacity
          style={[
            styles.cancelButton,
            (loading || isCancelingRef.current) && styles.cancelButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>{t("Matching.cancel")}</Text>
        </TouchableOpacity>
      </View>

      {/* ← ここがLoadingオーバーレイ */}
      {loading && <LoadingOverlay text={t("Matching.loading")} />}

      {/* ← ここがLoadingオーバーレイ */}
      {isCancelingRef.current && (
        <LoadingOverlay text={t("Matching.loading")} />
      )}
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
    paddingHorizontal: 24,
  },
  boardContainer: {
    marginBottom: 64,
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.08,
    // shadowRadius: 8,
    elevation: 2,
  },
  boardRow: {
    flexDirection: "row",
  },
  boardCell: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    width: 2.5,
    height: 56,
    backgroundColor: "#cbd5e0",
    top: 28,
  },
  horizontalLine: {
    position: "absolute",
    width: 56,
    height: 2.5,
    backgroundColor: "#cbd5e0",
    left: 28,
  },
  blackStone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2d3748",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    // shadowRadius: 2,
    elevation: 1,
  },
  whiteStone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    // shadowRadius: 2,
    elevation: 1,
  },
  emptyPoint: {
    width: 0,
    height: 0,
    zIndex: 10,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 64,
    minHeight: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a202c",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  dotsContainer: {
    marginTop: 8,
    height: 24,
    justifyContent: "center",
  },
  dots: {
    fontSize: 32,
    color: "#718096",
    fontWeight: "300",
    textAlign: "center",
    minWidth: 60,
  },
  cancelButton: {
    backgroundColor: "#ffffff",
    width: "100%",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelButtonDisabled: {
    backgroundColor: "#f1f5f9", // 無効っぽい薄いグレー
    borderColor: "#cbd5e0", // 枠も薄く
  },

  cancelButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d3748",
    letterSpacing: 0.5,
  },
});
