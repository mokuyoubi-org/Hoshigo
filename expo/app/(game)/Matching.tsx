// Matching.tsx

import { AnimatedGoBoard } from "@/src/components/AnimatedGoBoard";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { UidContext } from "@/src/contexts/UserContexts";
import {
  clearGameChannel,
  clearUserChannel,
  game_finished_ref,
  game_move_ref,
  setGameChannel,
  setUserChannel,
  user_finished_ref,
} from "@/src/services/gameChannel";
import { supabase } from "@/src/services/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Matching() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const uid = useContext(UidContext);
  useEffect(() => {
    if (!uid) return;
    console.log("uid: ", uid);
    clearUserChannel();

    clearGameChannel();

    joinWaiting();
  }, [uid]);

  const joinWaiting = async () => {
    if (!uid) return;
    const userChannel = supabase.channel(`user:${uid}`);
    setUserChannel(userChannel);

    userChannel
      .on("broadcast", { event: "matched" }, async (payload) => {
        // イベント名: matched
        console.log("📨 matched全体:", JSON.stringify(payload));
        setLoading(true);
        const data = payload.payload ?? payload;

        // ─── game チャンネルをここで全部設定する ──────────

        const gameChannel = supabase.channel(`game:${data.match_id}`);
        setGameChannel(gameChannel);

        gameChannel
          // ─── Broadcast: 手・結果を受け取る ───────────
          // Playing.tsxがマウントされた後にコールバックがセットされる。
          // それ以前に届いたペイロードはPlaying.tsx側で初期データ取得するので問題なし。
          .on("broadcast", { event: "move" }, (payload) => {
            // イベント名: move
            game_move_ref.current?.(payload); // これは偽名。本名は「handleBroadcastPayload」
          })
          .on("broadcast", { event: "finished" }, (payload) => {
            // イベント名: move
            game_finished_ref.current?.(payload); // これは偽名。本名は「handleBroadcastPayload」
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              // ─── Playing.tsx へ遷移 ───────────────────
              setLoading(false);

              // 1. userサブスクし、
              // 2. userサブスク確定したら、
              // 3. joinwaitingし、
              // 4. playing新規作成トリガーからuserサブスク宛へmatchidおよびその他が届いたら、
              // 5. matchサブスクし、
              // 6. matchサブスク確定したら遷移↓
              router.replace({
                pathname: "/Playing",
                params: {
                  matchId: data.match_id, // マッチid
                  matchType: data.match_type, // マッチのタイプ
                  moves: JSON.stringify(data.moves ?? []), // moves
                  myColor: data.my_color, // 自分の色
                  oppDisplayname: data.opp_displayname, // 相手の表示名
                  oppGumiIndex: data.opp_gumi_index, // 相手のぐみ
                  oppIconIndex: data.opp_icon_index, // 相手のアイコン
                  mySeconds: data.my_seconds, // 自分の残り秒数
                  oppSeconds: data.opp_seconds, // 相手の残り秒数
                },
              });
            }
          });
      })
      .on("broadcast", { event: "finished" }, (payload) => {
        // イベント名: move
        user_finished_ref.current?.(payload); // これは偽名。本名は「handleBroadcastPayload」
      })
      .subscribe(async (status, err) => {
        console.log("user チャンネル status:", status);
        console.log("user チャンネル err:", err);
        if (status === "SUBSCRIBED") {
          // まず {user: 自分のuid} というチャンネルにサブスクする。それが完了したら、rpcを呼ぶ。
          // なので、broadcastの取り損ねは発生しない。

          // 接続復帰の場合、userチャンネルからはbroadcastは来ない。
          // なぜなら、broadcastはplayingに新規作成された時に発火するトリガーだからだ。
          // なので接続復帰の場合はrpcの戻り値を使って復帰する必要がある
          const { data, error } = await supabase
            .schema("game")
            .rpc("join_waiting");

          if (error) {
            console.error("join_waiting error:", error);
            return;
          }

          // dataが返ってきたと言うことはすでに対局が存在する。接続復帰
          if (data) {
            router.replace({
              pathname: "/Playing",
              params: {
                matchId: data.match_id, // マッチid
                matchType: data.match_type, // マッチのタイプ
                moves: JSON.stringify(data.moves ?? []), // moves
                myColor: data.my_color, // 自分の色
                oppDisplayname: data.opp_displayname, // 相手の表示名
                oppGumiIndex: data.opp_gumi_index, // 相手のぐみ
                oppIconIndex: data.opp_icon_index, // 相手のアイコン
                mySeconds: data.my_seconds, // 自分の残り秒数
                oppSeconds: data.opp_seconds, // 相手の残り秒数
              },
            });
          }
        }
      });
  };

  const cancelWaiting = async () => {
    if (!uid) return;
    setLoading(true);
    const { data, error } = await supabase.schema("game").rpc("cancel_waiting");
    setLoading(false);

    if (error) {
      console.error("cancel_waiting error:", error);
      return;
    }

    if (!data) {
      clearUserChannel();
      router.replace("/(tabs)/Home");
      return;
    }

    // ここに来た時点でdataは絶対ある
    router.replace({
      pathname: "/Playing",
      params: {
        matchId: data.match_id,
        matchType: data.match_type,
        moves: JSON.stringify(data.moves ?? []),
        myColor: data.my_color,
        oppDisplayname: data.opp_displayname,
        oppGumiIndex: data.opp_gumi_index,
        oppIconIndex: data.opp_icon_index,
        mySeconds: data.my_seconds,
        oppSeconds: data.opp_seconds,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <AnimatedGoBoard />

        <View style={styles.messageContainer}>
          <Text style={styles.title}>{t("Matching.title")}</Text>
        </View>

        <TouchableOpacity
          style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
          activeOpacity={0.8}
          onPress={cancelWaiting}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </View>

      <LoadingModal text={t("common.loading")} visible={loading} />
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
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e0",
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d3748",
    letterSpacing: 0.5,
  },
});
