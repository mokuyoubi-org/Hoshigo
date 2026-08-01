// @/src/active/contexts/MatchingContext.tsx
//
// ====================================================================================
// 【ファイル全体の責務】
// 何をアプリ全体で共有してるか: 今マッチング待ちか否か。また、何路盤でマッチング待ちか。
//
// 1. マッチング待ち状態の管理(isMatching / matchingBoardSize)
// 2. 「対局が成立した」ことの検知(userChannelのmatchedイベント)→ Playingへ遷移
// 3. 「対局が終わってポイントが変動した」ことの通知(userChannelのfinishedイベント)
//    → onUserFinishedで登録したコールバックに伝える
//
// ゲーム進行中(move/double_pass/finished)のgameChannelは、
// このContextではなく、Playing画面側のhook(useGameChannelなど)が
// matchIdに紐づけて直接購読する。理由：
// gameChannelは「Playing画面が開いている間だけ」必要なものであり、
// アカウントレベルで生き続ける必要がない。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================
import { supabase } from "@/src/stable/services/supabase/supabase";
import { BoardSize } from "@/src/stable/types/goTypes";
import { RealtimeChannel } from "@supabase/supabase-js";
import { router } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useProfile } from "./ProfileContexts";

interface MatchingContextType {
  isMatching: boolean;
  matchingBoardSize: BoardSize | null;
  startMatching: (boardSize: BoardSize) => Promise<void>;
  cancelMatching: () => Promise<void>;
  // 対局終了後のポイント変動通知(user_finished)を購読するための関数。
  // 戻り値の関数を呼ぶと購読解除できる(Reactのクリーンアップと同じ作法)。
  onUserFinished: (callback: (payload: any) => void) => () => void;
}

const MatchingContext = createContext<MatchingContextType | undefined>(
  undefined,
);

// join_waiting(復帰時)・cancel_waiting・matchedイベント、
// いずれも同じ形のデータを返すので、Playing画面のparamsへの変換をここに集約。
// 【TODO】opp_usernameがRPC側で未対応なので、ここではundefinedのまま渡る。
//        SQL側(join_waiting/cancel_waiting)にopp_usernameを追加してもらう必要あり。
const buildPlayingParams = (data: any) => ({
  matchId: data.match_id,
  boardSize: data.board_size,
  matchType: data.match_type,
  moves: JSON.stringify(data.moves ?? []),
  myColor: data.my_color,
  oppUsername: data.opp_username,
  oppGroupIndex: data.opp_group_index,
  oppIconIndex: data.opp_icon_index,
  mySeconds: data.my_seconds,
  oppSeconds: data.opp_seconds,
  botMatch: data.bot_match,
});

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

// 🟦
export const MatchingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchingBoardSize, setMatchingBoardSize] = useState<BoardSize | null>(
    null,
  );
  const { profile } = useProfile();
  const uid = profile.uid;
  const userChannelRef = useRef<RealtimeChannel | null>(null);
  // user_finishedを聞きたいコンポーネント(主にPlaying画面)のコールバックを保持
  const userFinishedHandlerRef = useRef<((payload: any) => void) | null>(null);

  const onUserFinished = (callback: (payload: any) => void) => {
    userFinishedHandlerRef.current = callback;
    return () => {
      userFinishedHandlerRef.current = null;
    };
  };

  // ─── userChannelはuidが分かった時点で一度だけ購読し、
  //     アプリが生きている間ずっと維持する ───────────────
  useEffect(() => {
    if (!uid) return;

    const userChannel = supabase.channel(`user:${uid}`);
    userChannelRef.current = userChannel;

    userChannel
      .on("broadcast", { event: "matched" }, (payload) => {
        console.log("🎯 matched受信!", payload);
        const data = payload.payload ?? payload;

        setIsMatching(false);
        setMatchingBoardSize(null);

        router.replace({
          pathname: "/Playing",
          params: buildPlayingParams(data),
        });
      })
      .on("broadcast", { event: "points_updated" }, (payload) => {
        userFinishedHandlerRef.current?.(payload);
      })
      .subscribe((status, err) => {
        console.log("🐱 userChannel status:", status, err);
      });

    return () => {
      supabase.removeChannel(userChannel);
      userChannelRef.current = null;
    };
  }, [uid]);

  // ─── 1. マッチング開始(joinWaiting) ───────────────────
  // join_waitingはvoidを返す(既存対局への復帰時のみ内部でmatchedをbroadcastする)。
  // 新規マッチ成立の通知は、上のuseEffectで購読しているuserChannelのmatchedで受け取る。
  const startMatching = async (boardSize: BoardSize) => {
    console.log("🐱 startMatching呼ばれた！ isMatching:", isMatching);

    if (!uid || isMatching) return;

    setIsMatching(true);
    setMatchingBoardSize(boardSize);

    const { error } = await supabase.rpc("join_waiting", {
      p_board_size: boardSize,
    });

    if (error) {
      console.error("join_waiting error:", error);
      setIsMatching(false);
      setMatchingBoardSize(null);
    }
    // 成功時、既に対局中だった場合はここでmatchedが飛んでくる(上のuseEffectが処理)。
    // 新規待機の場合は、マッチが成立するまでisMatching=trueのまま待つ。
  };

  // ─── 2. キャンセル処理 ───────────────────
  const cancelMatching = async () => {
    if (!uid) return;

    const { data, error } = await supabase.rpc("cancel_waiting");

    if (error) {
      console.error("cancel_waiting error:", error);
      return;
    }

    setIsMatching(false);
    setMatchingBoardSize(null);

    // 既に対局が成立していた場合、dataに対局情報が直接返ってくるのでPlayingへ
    if (data) {
      router.replace({
        pathname: "/Playing",
        params: buildPlayingParams(data),
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
        onUserFinished,
      }}
    >
      {children}
    </MatchingContext.Provider>
  );
};

// 🟦
export const useMatching = () => {
  const context = useContext(MatchingContext);
  if (!context) {
    throw new Error("useMatching must be used within a MatchingProvider");
  }
  return context;
};
