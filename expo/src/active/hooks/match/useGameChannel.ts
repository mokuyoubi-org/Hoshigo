import { supabase } from "@/src/stable/services/supabase/supabase";
import { useRealtimeChannel } from "supabase-toolkit";

export type GameChannelHandlers = {
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
      move: handlers.onMove,
      double_pass: handlers.onDoublePass,
      rating_updated: handlers.onRatingUpdated ?? (() => {}),
    },
    enabled,
  );

  return { reconnect };
}
