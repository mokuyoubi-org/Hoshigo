// useGameChannel.ts
// ぶっちゃけ仕事自体は全部useRealtimeChannelに任せていて何にもしてない
// 名前の管理および整えることを担当。

import { supabase } from "@/src/stable/services/supabase/supabase";
import { useRealtimeChannel } from "supabase-kit";

type GameChannelHandlers = {
  onMove: (payload: any) => void;
  onDoublePass: (payload: any) => void;
  onRatingUpdated?: (payload: any) => void;
};

export function useGameChannel(
  matchId: number | null,
  handlers: GameChannelHandlers,
  enabled: boolean = true,
) {
  // 🐱 reconnect を受け取ってそのまま返す
  const { reconnect } = useRealtimeChannel(
    supabase,
    matchId ? `game:${matchId}` : null,
    {
      // gameチャンネルからmoveイベントを受け取ったら、onMove() === gameCh_move()を実行
      move: handlers.onMove,
      // double_passイベントを受け取ったらgameCh_double_pass()を実行
      double_pass: handlers.onDoublePass,
      // rating_updatedイベントを受け取ったらgameCh_rating_updated()を実行
      rating_updated: handlers.onRatingUpdated ?? (() => {}),
    },
    enabled,
  );

  return { reconnect };
}
