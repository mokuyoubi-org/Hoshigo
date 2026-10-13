// recordsRPC.ts
// サーバーの get_records_older を呼んで、アプリの RecordType に翻訳する

import { api } from "@/src/services/api/api";
import { RecordType } from "@/src/types/record";
import { BoardSize, MatchType, RecordAnalysis } from "go-core";

type ServerRecordRow = {
  id: string;
  created_at: string;
  result: string | null;
  match_type: number;
  moves: number[] | null;
  black_points: number;
  white_points: number;
  board_size: number;
  black_uid: string;
  black_username: string | null; // 退会した人は null
  black_icon_index: number | null;
  black_rank_index: number;
  white_uid: string;
  white_username: string | null;
  white_icon_index: number | null;
  white_rank_index: number;
};

const toRecordType = (row: ServerRecordRow): RecordType => ({
  id: row.id,
  black_uid: row.black_uid,
  white_uid: row.white_uid,
  created_at: row.created_at,
  black_username: row.black_username ?? "---", // 退会した人。あとで多言語にしてもよい
  white_username: row.white_username ?? "---",
  black_icon_index: row.black_icon_index ?? 0,
  white_icon_index: row.white_icon_index ?? 0,
  black_rank_index: row.black_rank_index,
  white_rank_index: row.white_rank_index,
  black_rating: row.black_points,
  white_rating: row.white_points,
  board_size: row.board_size as BoardSize,
  result: row.result,
  moves: row.moves ?? [], // R2に棋譜が無い場合は空(盤面が空で開く)
  match_type: row.match_type as MatchType,
  analysis: null, // 分析は一覧には入っていない。開いてから分析ボタンで作る
});

// 1ページ分(新しい順)。beforeId = 前のページの、いちばん古い棋譜のid(最初は null)
export const fetchRecordsPage = async (
  uid: string,
  boardSize: BoardSize,
  beforeId: string | null,
  limit: number,
): Promise<RecordType[]> => {
  const { data, error } = await api.rpc<ServerRecordRow[]>(
    "get_records_older",
    {
      p_uid: uid,
      p_board_size: boardSize,
      p_limit: limit,
      p_before_id: beforeId,
    },
  );
  if (error || !data) {
    throw new Error(error?.message ?? "get_records_older failed");
  }
  return data.map(toRecordType);
};

type ServerAnalysis = {
  ownership: (number[] | null)[]; // 各局面: -100〜100
  score_lead: (number | null)[]; // 10倍
  win_rate: (number | null)[]; // 1000倍
};

// サーバーの整数の形を、アプリの RecordAnalysis(小数・%)に戻す。
// 失敗しても例外は投げず、null を返す(分析なしで開く)。
// 候補手(candidates)はサーバーに保存していないので、空にする。
export const fetchRecordAnalysis = async (
  gameId: string,
): Promise<RecordAnalysis | null> => {
  try {
    const { data, error } = await api.rpc<{ analysis: ServerAnalysis | null }>(
      "get_record_analysis",
      { p_game_id: gameId },
    );
    const a = data?.analysis;
    if (error || !a) return null;

    const perMove = a.ownership.map((own, i) => {
      const lead = a.score_lead[i];
      const win = a.win_rate[i];
      if (!own || lead == null || win == null) return null;
      return {
        winRate: Math.round(win / 10),
        scoreLead: lead / 10,
        ownership: own.map((v) => v / 100),
        candidates: [],
      };
    });
    return { perMove };
  } catch (e) {
    console.error("分析の取得に失敗:", e);
    return null;
  }
};