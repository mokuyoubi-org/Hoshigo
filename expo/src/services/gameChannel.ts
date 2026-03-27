// src/services/gameChannel.ts

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

let gameChannel: RealtimeChannel | null = null;
let userChannel: RealtimeChannel | null = null;

// ─── チャンネルにサブスク ─────────────────────
export const setGameChannel = (ch: RealtimeChannel) => {
  if (gameChannel) {
    supabase.removeChannel(gameChannel);
    console.log("gameチャンネル サブスク開始");
  }
  gameChannel = ch;
};

export const setUserChannel = (ch: RealtimeChannel) => {
  if (userChannel) {
    supabase.removeChannel(userChannel);
    console.log("gameチャンネル サブスク開始");
  }
  userChannel = ch;
};

// ─── サブスク解除 ───────────────────────────
export const clearGameChannel = () => {
  console.log("clearGameChannel実行");

  if (gameChannel) {
    supabase.removeChannel(gameChannel);
    console.log("gameチャンネル サブスク解除");
    gameChannel = null;
  }
};

export const clearUserChannel = () => {
  console.log("clearUserChannel実行");

  if (userChannel) {
    supabase.removeChannel(userChannel);
    console.log("userチャンネル サブスク解除");
    userChannel = null;
  }
};

// Matching.tsxで登録したbroadcastハンドラから呼ぶコールバック。
// Playing.tsxがマウントされた時点でセットされる。

// 「game_move_ref.current」の中身は「game_move」
export const game_move_ref = {
  current: null as ((payload: any) => void) | null,
};

// 「game_finished_ref.current」の中身は「game_finished」
export const game_finished_ref = {
  current: null as ((payload: any) => void) | null,
};

// 「user_finished_ref.current」の中身は「user_finished」
export const user_finished_ref = {
  current: null as ((payload: any) => void) | null,
};
