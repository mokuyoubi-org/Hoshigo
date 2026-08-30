// matchingRPC.ts

import { supabase } from "@/src/stable/services/supabase/supabase";
import { BoardSize } from "expo-goband";

export type PlayingParams = {
  matchId: number;
  boardSize: BoardSize;
  matchType: string;
  moves: string;
  myColor: string;
  oppUsername: string;
  oppPoints: number;
  oppIconIndex: number;
  mySeconds: number;
  oppSeconds: number;
  botMatch: string;
};

export const formatPlayingParams = (data: any): PlayingParams => ({
  matchId: data.match_id,
  boardSize: data.board_size,
  matchType: data.match_type,
  moves: JSON.stringify(data.moves ?? []),
  myColor: data.my_color,
  oppUsername: data.opp_username ?? "対戦相手",
  oppPoints: data.opp_points ?? 0,
  oppIconIndex: data.opp_icon_index ?? 0,
  mySeconds: data.my_seconds ?? 0,
  oppSeconds: data.opp_seconds ?? 0,
  botMatch: String(data.bot_match ?? false), // 🐱 String() で "true" か "false" の文字列にする
});

export const joinWaitlistRPC = async (boardSize: BoardSize) => {
  return await supabase.rpc("join_waitlist", { p_board_size: boardSize });
};

export const cancelWaitlistRPC = async () => {
  return await supabase.rpc("cancel_waitlist");
};
