// MatchingContext.tsx
// プレイボタンを押して、マッチングを開始したり、サーチングボタンでキャンセルボタンを押した時の処理が書いてある。

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import {
  cancelWaitlistRPC,
  formatPlayingParams,
  joinWaitlistRPC,
} from "@/src/stable/logics/matchingRPC";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { BoardSize } from "expo-goband";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type MatchingContextType = {
  isMatching: boolean;
  matchingBoardSize: BoardSize | null;
  startMatching: (boardSize: BoardSize) => Promise<void>;
  cancelMatching: () => Promise<void>;
};

export const MatchingContext = createContext<MatchingContextType | null>(null);

export const MatchingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchingBoardSize, setMatchingBoardSize] = useState<BoardSize | null>(
    null,
  );
  const { uid } = useProfile();
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
    if (isMatching || !uid) return;

    unsubscribeUserChannel(); // 開始前に古い接続があれば切る

    console.log("🐱 マッチング開始！");
    setIsMatching(true);
    setMatchingBoardSize(boardSize);

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

      router.replace({
        pathname: "/GameScreen",
        params: formatPlayingParams(data),
      });
    });

    // 🐱 2. サブスクの接続完了を待って、状態を受け取る
    const status = await new Promise<string>((resolve) => {
      userChannel.subscribe((status) => {
        resolve(status);
      });
    });

    // 🐱 3. もしサブスクが失敗したら、安全にキャンセルして終わる
// 🐱 3. もしサブスクが失敗したら、安全にキャンセルして終わる
    if (status !== "SUBSCRIBED") {
      // CLOSED（意図的な切断）の時はエラーログを出さずに静かに終わるにゃ！
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

    // 🐱 4. 準備が100%整ってからRPCを呼ぶ！
    const { data, error } = await joinWaitlistRPC(boardSize);

    // エラーだった場合全部取りやめ
    if (error) {
      unsubscribeUserChannel();
      setIsMatching(false);
      setMatchingBoardSize(null);
      console.error("join_waitlist error:", error);
      return;
    }

    // 🐱 すでに対局中でデータが返ってきたら、即座に対局画面へ復帰！
    if (data) {
      unsubscribeUserChannel();
      setIsMatching(false);
      setMatchingBoardSize(null);

      router.replace({
        pathname: "/GameScreen",
        params: formatPlayingParams(data),
      });
    }
  };

  // キャンセルボタン押した
  const cancelMatching = async () => {
    const { data } = await cancelWaitlistRPC();

    // キャンセル成功にせよ、すでに対局が存在していたにせよ、userchannelはもう不要だし、matchingフェーズでもない
    unsubscribeUserChannel();
    setIsMatching(false);
    setMatchingBoardSize(null);

    if (data) {
      router.replace({
        pathname: "/GameScreen",
        params: formatPlayingParams(data),
      });
    }
  };

  return (
    <MatchingContext.Provider
      value={{
        isMatching,
        matchingBoardSize,
        startMatching,
        cancelMatching,
      }}
    >
      {children}
    </MatchingContext.Provider>
  );
};

export const useMatching = () => {
  const context = useContext(MatchingContext);
  if (!context) {
    throw new Error("useMatching must be used within a MatchingProvider");
  }
  return context;
};
