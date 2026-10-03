// useMatchingProvider.ts
// 2026/10/03: 対局数上限検知追加
// マッチングの状態管理と、開始/キャンセル処理のロジック本体。
// MatchingContext.tsx から呼ばれる想定。
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import {
  cancelWaitlistRPC,
  formatPlayingParams,
  joinWaitlistRPC,
} from "@/src/stable/logics/matchingRPC";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ModelStatus, useKataGoEngine } from "expo-katago";
import { router } from "expo-router";
import { BoardSize } from "go-core";
import { useCallback, useRef, useState } from "react";

export function useMatchingProvider(
  // 「19路を選択したのにb18の準備がまだ」と判定した瞬間に呼ばれる。
  // モーダル表示などのUI関心事はこの呼び出し元(コンポーネント層)の責務にする。
  // phaseを渡すことで、「未DL」なのか「DL中/ウォームアップ中」なのかを
  // 呼び出し元が区別して表示を出し分けられるようにする(readyのときは呼ばれない)。
  onNeedsB18Download: (phase: ModelStatus["phase"]) => void,
  // 匿名ユーザが、その盤面の1日の対局数の上限に達していて、
  // サーバ(join_waitlist)に待機列への追加を断られた瞬間に呼ばれる。
  // 「ログインしてください」モーダルなどのUI関心事は、呼び出し元の責務にする。
  onDailyLimitReached: () => void,
) {
  const [isMatching, setIsMatching] = useState(false);
  const [matchingBoardSize, setMatchingBoardSize] = useState<BoardSize | null>(
    null,
  );
  const { uid } = useProfile();
  const { getModelStatus } = useKataGoEngine();
  const userChannelRef = useRef<RealtimeChannel | null>(null);

  // 🔒公開しない
  const unsubscribeUserChannel = useCallback(() => {
    if (userChannelRef.current) {
      console.log("🐱 userChannel を切断した");
      supabase.removeChannel(userChannelRef.current);
      userChannelRef.current = null;
    }
  }, []);

  // マッチング開始！
  const startMatching = async (boardSize: BoardSize) => {
    // 🛡️ガード
    if (isMatching || !uid) return;

    if (boardSize === 19) {
      const b18Status = getModelStatus("b18");
      if (b18Status.phase !== "ready") {
        onNeedsB18Download(b18Status.phase);
        return;
      }
    }

    // 🐱 連打対策も兼ねて、フェッチより先にフラグを立てておく
    setIsMatching(true);
    setMatchingBoardSize(boardSize);

    unsubscribeUserChannel(); // 開始前に古い接続があれば切る

    console.log("🐱 マッチング開始！");

    const userChannel = supabase.channel(`user:${uid}`);
    userChannelRef.current = userChannel;

    // 🐱 1. まずイベントを受け取る準備を書く
    userChannel.on("broadcast", { event: "matched" }, (payload) => {
      // サブスク通知が届いた時の処理
      const data = payload.payload ?? payload;
      unsubscribeUserChannel();
      setIsMatching(false);
      setMatchingBoardSize(null);

      console.log("[MatchingContext]data: ", data);

      setTimeout(() => {
        // 通常の対局開始
        router.replace({
          pathname: "/GameScreen",
          params: formatPlayingParams(data),
        });
      }, 0);
    });

    // 🐱 2. サブスクの接続完了を待って、状態を受け取る
    const status = await new Promise<string>((resolve) => {
      userChannel.subscribe((status) => {
        resolve(status);
      });
    });

    // 🐱 3. もしサブスクが失敗したら、安全にキャンセルして終わる
    if (status !== "SUBSCRIBED") {
      if (status !== "CLOSED") {
        console.error("🐱 サブスクの接続に失敗… status:", status);
      } else {
        console.log("🐱 接続中にキャンセルされた");
      }

      unsubscribeUserChannel();
      setIsMatching(false);
      setMatchingBoardSize(null);
      return;
    }

    console.log("userチャンネル接続OK!join_waitlistを呼びます");

    // 🐱 4. ローカルの最新IDを取得して、準備が100%整ってからRPCを呼ぶ！
    const localNewestId = await recordsRepo.getNewestId(boardSize);
    const modelStatus = getModelStatus("b18");
    const hasB18 = modelStatus.phase === "ready";
    const { data, error } = await joinWaitlistRPC(
      boardSize,
      hasB18,
      localNewestId,
    );

    // エラーだった場合全部取りやめ
    if (error) {
      unsubscribeUserChannel();
      setIsMatching(false);
      setMatchingBoardSize(null);

      // 🎫 1日の対局数の上限に達していた場合は、エラーログではなくUIに知らせる
      if (error.message?.includes("daily_play_limit_reached")) {
        console.log("🐱 1日の対局数の上限に達している");
        onDailyLimitReached();
        return;
      }

      console.error("join_waitlist error:", error);
      return;
    }

    // 🐱 返ってきたレスポンスを整理（合体対応）
    // dataが古い形式(直接matchオブジェクト)の場合と新しい形式(オブジェクト包み)の両方に対応
    const matchData = data?.match ?? (data?.match_id ? data : null);
    const newerRecords = data?.newer_records ?? [];

    // 🌟 差分棋譜があれば、裏でひっそりローカル保存（awaitせずスルー！）
    if (newerRecords.length > 0) {
      console.log(`${newerRecords.length} 件の新着棋譜をもらったので裏で保存`);
      recordsRepo.insertMany(newerRecords).catch((e) => {
        console.error("🐱 棋譜のローカル保存に失敗", e);
      });
    } else {
      console.log("取りこぼし棋譜なし");
    }

    // 🐱 すでに対局中でデータが返ってきたら、即座に対局画面へ復帰！
    if (matchData) {
      unsubscribeUserChannel();
      setIsMatching(false);
      setMatchingBoardSize(null);

      setTimeout(() => {
        // 接続復帰
        router.replace({
          pathname: "/GameScreen",
          params: formatPlayingParams(matchData),
        });
      }, 0);
    }
  };

  // キャンセルボタン押した
  const cancelMatching = async () => {
    const { data } = await cancelWaitlistRPC();

    unsubscribeUserChannel();
    setIsMatching(false);
    setMatchingBoardSize(null);

    if (data) {
      // キャンセルボタン効かなかった
      setTimeout(() => {
        router.replace({
          pathname: "/GameScreen",
          params: formatPlayingParams(data),
        });
      }, 0);
    }
  };

  return {
    isMatching,
    matchingBoardSize,
    startMatching,
    cancelMatching,
  };
}