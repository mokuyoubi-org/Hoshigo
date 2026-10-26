// expo/src/logics/rpc/recordsRPC.ts
// サーバーの get_records_older を呼んで、アプリの RecordType に翻訳する

import { api } from "@/src/services/api/api";
import { RecordType } from "@/src/types/record";
import {
  BoardSize,
  Grid,
  MatchType,
  ownershipToScoreLead,
  RecordAnalysis,
} from "go-core";
import { isAnalysisComplete, toServerAnalysis } from "../game/analysis";

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
  final_ownership?: string | null; // 一覧のカードで地を出すための、最終局面だけの予想("BBW.."の文字列)
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
  final_ownership: row.final_ownership,
});

// 1ページ分(新しい順)。beforeId = 前のページの、いちばん古い棋譜のid(最初は null)
export const fetchRecordsPage = async (
  uid: string,
  boardSize: BoardSize,
  beforeId: string | null,
  limit: number,
): Promise<RecordType[]> => {
  const query = new URLSearchParams({
    p_uid: uid,
    p_board_size: String(boardSize),
    p_limit: String(limit),
    ...(beforeId ? { p_before_id: beforeId } : {}),
  });
  const { data, error } = await api.get<ServerRecordRow[]>(
    `get_records_older?${query}`,
  );
  if (error || !data) {
    throw new Error(error?.message ?? "get_records_older failed");
  }
  return data.map(toRecordType);
};

type ServerAnalysis = {
  ownership: (string | null)[]; // 各局面: 1点1文字の文字列(B / W / .) ここは正しい気がする
  win_rate: (number | null)[];
  candidates?: (Grid[] | null)[]; // 古い保存ファイルには無い
};

// scoreLead は保存していないので、ownershipToScoreLead()から作る。
// pos[i] は「i手打たれた局面」なので、その局面までの手(moves の先頭 i 手)で計算する。
// ただし最後の局面だけは、対局結果(result)の数字を使う(goscorerで数えた値に合わせるため)。
// candidates(候補手)は保存したものをそのまま使う。古いファイルで無ければ空。
// 失敗しても例外は投げず、null を返す(分析なしで開く)。
// expo/src/logics/rpc/recordsRPC.ts (fetchRecordAnalysis 全体)

export const fetchRecordAnalysis = async (
  gameId: string,
  moves: Grid[],
  boardSize: BoardSize,
  matchType: MatchType,
  result: string | null,
): Promise<RecordAnalysis | null | "not_found"> => {
  try {
    const { data, error } = await api.get<{
      analysis: ServerAnalysis | null;
      record_exists?: boolean; // 分析が無いときだけ入る。false なら、対局そのものが無い
    }>(`analysis/${encodeURIComponent(gameId)}`);
    if (error || !data) return null;
    if (data.record_exists === false) return "not_found";
    const a = data.analysis;
    if (!a) return null;
    const pos = a.ownership.map((own, i) => {
      const win = a.win_rate[i];
      const ownership = own;
      if (!ownership || win == null) return null;
      const scoreLead = ownershipToScoreLead(
        ownership,
        moves.slice(0, i), // ⚠️ややこしいが、movesではなくsliceされたmovesを使う必要がある...
        matchType,
        boardSize,
      );
      return {
        winRate: win,
        scoreLead,
        ownership,
        candidates: a.candidates?.[i] ?? [],
      };
    });
    return { pos };
  } catch (e) {
    console.error("分析の取得に失敗:", e);
    return null;
  }
};
// 分析を、まとめてサーバーへ出す(R2に保存される)。
// 全部の局面がそろっていないときは、出さない(サーバーも断る。足りない分は、棋譜を開くときに補われる)。
// 先に届いた方が使われる。待たずに投げっぱなしでよい。失敗しても、対局の結果には関係ない。
export const submitAnalysis = async (
  gameId: string,
  analysis: RecordAnalysis,
  positions: number,
): Promise<void> => {
  if (!isAnalysisComplete(analysis, positions - 1)) return;

  const body = toServerAnalysis(analysis, positions);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await api.rpc("submit_analysis", {
        p_game_id: gameId,
        p_analysis: body,
      });
      if (!error) return;
    } catch (e) {
      console.error("分析の提出で例外発生:", e);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  console.error("分析を提出できなかった");
};
