// Hoshigo
// expo/src/logics/rpc/tsumegoRPC.ts
// サーバーの get_tsumego_batch / submit_tsumego_result を呼ぶ

import { api } from "@/src/services/api/api";
import { TsumegoResult, TsumegoType } from "@/src/types/tsumego";
import { BoardSize } from "go-core";

// 「出さない」設定(true にした種類の問題は、サーバーが全部除く)
export type TsumegoHideSettings = {
  skipped: boolean;
  solved: boolean;
  failed: boolean;
};

// 詰碁を10問もらう。
// excludeIds = アプリの手元にもう持っている問題のid(同じ問題を、また渡されないように)
export const fetchTsumegoBatch = async (
  boardSize: BoardSize,
  excludeIds: string[],
  hide: TsumegoHideSettings,
): Promise<TsumegoType[]> => {
  const { data, error } = await api.rpc<TsumegoType[]>("get_tsumego_batch", {
    p_board_size: boardSize,
    p_exclude_ids: excludeIds,
    p_hide_skipped: hide.skipped,
    p_hide_solved: hide.solved,
    p_hide_failed: hide.failed,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "get_tsumego_batch failed");
  }
  return data;
};

type SubmitTsumegoResponse = {
  rating_counted: boolean; // レートが動いたかどうか(初めて解けた/解けなかったときだけ true)
  rating_delta?: number; // 自分のレートの増減(動かなかったときは 0)
  new_rating?: number; // レートが動いたときだけ入る
};

// 結果(解けた / 解けなかった / 飛ばした)を送る。
// 画面を止めたくないので、失敗しても例外は投げず、null を返す。
export const submitTsumegoResult = async (
  tsumegoId: string,
  result: TsumegoResult,
): Promise<SubmitTsumegoResponse | null> => {
  try {
    const { data, error } = await api.rpc<SubmitTsumegoResponse>(
      "submit_tsumego_result",
      { p_tsumego_id: tsumegoId, p_result: result },
    );
    if (error || !data) return null;
    return data;
  } catch (e) {
    console.error("詰碁の結果の送信に失敗:", e);
    return null;
  }
};

// いいねをつける(liked = true)・外す(liked = false)。
// 成功したら true を返す。失敗しても例外は投げず、false を返す(画面側で、見た目を元に戻す)。
export const setTsumegoLike = async (
  tsumegoId: string,
  liked: boolean,
): Promise<boolean> => {
  try {
    const { data, error } = await api.rpc<{ liked: boolean }>(
      "set_tsumego_like",
      { p_tsumego_id: tsumegoId, p_liked: liked },
    );
    return !error && !!data;
  } catch (e) {
    console.error("いいねの送信に失敗:", e);
    return false;
  }
};