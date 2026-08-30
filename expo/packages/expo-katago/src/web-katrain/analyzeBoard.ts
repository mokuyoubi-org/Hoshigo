/**
 * analyzeBoard.ts
 *
 * web-katrain のエンジンコアを Expo から使うための薄いラッパー。
 *
 * ================================================================
 * 【入力形式】AnalyzeBoardArgs
 * ================================================================
 *
 * 必須:
 *   currentPlayer  'black' | 'white'  次の手番🌟
 *   modelId        ModelId            使用するモデル ("b10")🌟
 *
 *   board: number[][]🌟
 *   0=空点, 1=黒石, 2=白石 の二次元配列。
 *   例: [[0,1,0],[2,0,1],[0,0,0]]
 *   ※ moves も同時に渡すと履歴情報も活用されより正確になる。
 *
 *   moves: MoveObject[]🌟
 *   着手履歴の配列。board を省略するとここから盤面を再構築する。
 *   例: [{x:3, y:3, player:'black'}, {x:15, y:15, player:'white'}]
 *   ※ パスは x:-1, y:-1 で表現。
 *
 *
 * オプション:
 *   komi            number      コミ（デフォルト: 6.5）🌟
 *   rules           GameRules   'japanese'|'chinese'|'korean'（デフォルト: 'japanese'）🌟
 *   visits          number      MCTS 探索数（デフォルト: 200）🌟
 *                               多いほど精度↑・時間↑。cpu では 50〜200 が現実的。
 *   topK            number      返す候補手の数（デフォルト: 10）
 *   pvLen           number      読み筋の最大手数（デフォルト: 10）
 *   maxTimeMs       number      最大探索時間 ms（デフォルト: 800）
 *   wideRootNoise   number      ルートノードの探索幅ノイズ（デフォルト: 0.04）
 *                               大きいほど多様な手を探索する。
 *   nnRandomize     boolean     NN評価にランダム性を加える（デフォルト: true）
 *   regionOfInterest ROI        注目領域。この範囲の手を優先的に探索する。
 *                               例: {xMin:0, xMax:9, yMin:0, yMax:9}（左上隅）
 *
 * ================================================================
 * 【出力形式】AnalyzeResult
 * ================================================================
 *
 *   winRate         number        黒の勝率 0〜1🌟
 *   scoreLead       number        黒のスコアリード（正=黒有利、負=白有利）
 *   scoreSelfplay   number        自己対局スコア平均（scoreLead より荒い推定）
 *   scoreStdev      number        スコアの標準偏差（不確実性の指標）
 *   visits          number        実際の MCTS 総訪問数
 *
 *   ownership       number[]|Float32Array 各交点の帰属。長さ: boardSize*boardSize🌟
 *                                         インデックス: y * boardSize + x（行優先）
 *                                         値: +1.0=完全に黒の地, -1.0=完全に白の地
 *
 *   ownershipStdev  number[]|Float32Array ownership の標準偏差（同じ並び順）
 *                                         大きいほどその点の帰属が不確定。
 *
 *   policy          number[]|Float32Array ポリシーネットワークの出力確率。
 *                                         長さ: boardSize*boardSize + 1（最後がパス）
 *                                         着手不可の点は -1。
 *
 *   moves           MoveInfo[]    候補手リスト（訪問数の多い順）
 *     x, y          number        座標（0-indexed）。パスは x:-1, y:-1
 *     winRate       number        この手を打ったときの黒の勝率
 *     winRateLost   number        最善手との勝率差（正=悪手）
 *     scoreLead     number        この手を打ったときのスコアリード
 *     scoreSelfplay number        自己対局スコア平均
 *     scoreStdev    number        スコアの標準偏差
 *     visits        number        この手への MCTS 訪問数
 *     pointsLost    number        最善手との目数差（正=悪手）
 *     relativePointsLost number   2番手以降との相対目数差
 *     order         number        順位（0=最善手）
 *     prior         number        ポリシーネットワークの事前確率
 *     pv            string[]      読み筋（SGF座標文字列の配列）
 *                                 例: ["pd", "dd", "qp"]
 */



import * as tf from "@tensorflow/tfjs";
import { ungzip } from "pako";
import { analyzeMcts, playerToColor } from "./analyzeMcts";
import { initBoardArrays, SimPosition, playMove } from "./fastBoard";
import { parseKataGoModelV8 } from "./loadModelV8";
import { ModelId, readModelData } from "./modelManager";
import { KataGoModelV8Tf } from "./modelV8";
import { GameRules, RegionOfInterest, FloatArray, BoardState } from "./types";
import {  BLACK, BoardSize, Color, EMPTY, MoveObject, WHITE } from "../types";
import { Board2D } from "../utils";

// ================================================================
// 型定義
// ================================================================

export type AnalyzeBoardArgs = {
  currentPlayer: Color;
  modelId: ModelId;
  board: Board2D;
  moves: MoveObject[];
  boardSize: BoardSize;

  komi?: number;
  rules?: GameRules;
  visits?: number;
  maxTimeMs?: number;
  topK?: number;
  pvLen?: number;
  wideRootNoise?: number;
  nnRandomize?: boolean;
  regionOfInterest?: RegionOfInterest | null;
};

export type MoveInfo = {
  x: number;
  y: number;
  winRate: number;
  winRateLost: number;
  scoreLead: number;
  scoreSelfplay: number;
  scoreStdev: number;
  visits: number;
  pointsLost: number;
  relativePointsLost: number;
  order: number;
  prior: number;
  pv: string[];
};

export type AnalyzeResult = {
  winRate: number;
  scoreLead: number;
  scoreSelfplay: number;
  scoreStdev: number;
  visits: number;
  ownership: number[] | FloatArray;
  ownershipStdev: number[] | FloatArray;
  policy: number[] | FloatArray;
  moves: MoveInfo[];
};

// ================================================================
// モデルキャッシュ & ウォームアップ
// ================================================================

/** TFテンソルの待機と破棄をまとめて処理するヘルパー関数 */
async function disposeTensors(tensors: Record<string, tf.Tensor>) {
  await Promise.all(Object.values(tensors).map((t) => t.data()));
  Object.values(tensors).forEach((t) => t.dispose());
}

const modelCache = new Map<ModelId, KataGoModelV8Tf>();

export async function loadModel(modelId: ModelId): Promise<KataGoModelV8Tf> {
  const cached = modelCache.get(modelId);
  if (cached) return cached;

  const buf = await readModelData(modelId); // 未キャッシュ時はここで"downloading"通知が飛ぶ
  const data = buf[0] === 0x1f && buf[1] === 0x8b ? ungzip(buf) : buf;
  const parsed = parseKataGoModelV8(data);
  const model = new KataGoModelV8Tf(parsed);
  modelCache.set(modelId, model);

  const spatial = tf.zeros([1, 19, 19, 22], "float32") as tf.Tensor4D;
  const global_ = tf.zeros([1, 19], "float32") as tf.Tensor2D;
  await disposeTensors(model.forward(spatial, global_));
  await disposeTensors(model.forwardPolicyValue(spatial, global_));
  spatial.dispose();
  global_.dispose();

  return model;
}

// ================================================================
// 盤面解析メイン処理
// ================================================================

export async function analyzeBoard(
  args: AnalyzeBoardArgs,
): Promise<AnalyzeResult> {
  const {
    board,
    moves,
    currentPlayer,
    modelId,
    komi = 6.5,
    rules = "japanese",
    visits = 200, // デフォルト: 200
    maxTimeMs = 800, // デフォルト: 800
    topK = 10,
    pvLen = 10,
    wideRootNoise = 0.04,
    nnRandomize = true,
    regionOfInterest,
  } = args;

  initBoardArrays(args.boardSize);
  const zeroBasedMoves = normalizeMovesToZeroBased(moves ?? []);

  const previousBoard =
    zeroBasedMoves.length >= 1
      ? buildBoardFromMoves(
          zeroBasedMoves.slice(0, -1),
          board.length as BoardSize,
        )
      : undefined;

  const previousPreviousBoard =
    zeroBasedMoves.length >= 2
      ? buildBoardFromMoves(
          zeroBasedMoves.slice(0, -2),
          board.length as BoardSize,
        )
      : undefined;

  const model = await loadModel(modelId);

  const output = await analyzeMcts({
    model,
    board: padBoardState(board2DtoBoardState(board)),
    previousBoard: padBoardState(previousBoard),
    previousPreviousBoard: padBoardState(previousPreviousBoard),
    currentPlayer,
    moveHistory: zeroBasedMoves,
    komi,
    rules,
    visits,
    maxTimeMs,
    topK,
    analysisPvLen: pvLen,
    wideRootNoise,
    nnRandomize,
    regionOfInterest: regionOfInterest ?? null,
  });

  console.log("ownership status:", {
    exists: !!output.ownership,
    length: output.ownership?.length,
    isTypedArrayOrArray:
      output.ownership instanceof Float32Array ||
      Array.isArray(output.ownership),
  });

  return {
    winRate: output.rootWinRate,
    scoreLead: output.rootScoreLead,
    scoreSelfplay: output.rootScoreSelfplay,
    scoreStdev: output.rootScoreStdev,
    visits: output.rootVisits,
    ownership: output.ownership,
    ownershipStdev: output.ownershipStdev,
    policy: output.policy,
    moves: denormalizeMovesToOneBased(output.moves),
  };
}

export function board2DtoBoardState(board: Board2D): BoardState {
  return board.map((row) =>
    row.map((cell) => {
      if (cell === 1) return BLACK;
      if (cell === 2) return WHITE;
      return null;
    }),
  );
}

export function buildBoardFromMoves(
  moves: MoveObject[],
  boardSize: BoardSize,
): BoardState {
  const stones = new Uint8Array(boardSize * boardSize).fill(EMPTY);
  const pos: SimPosition = { stones, koPoint: -1 };
  const captureStack: number[] = [];

  for (const m of moves) {
    if (m.x < 0 || m.y < 0) {
      pos.koPoint = -1;
      continue;
    }
    const move = m.y * boardSize + m.x;
    playMove(pos, move, playerToColor(m.player), captureStack);
  }

  const board: BoardState = Array.from({ length: boardSize }, (_, y) =>
    Array.from({ length: boardSize }, (_, x) => {
      const s = stones[y * boardSize + x];
      if (s === BLACK) return BLACK;
      if (s === WHITE) return WHITE;
      return null;
    }),
  );
  return board;
}

export function normalizeMovesToZeroBased(moves: MoveObject[]): MoveObject[] {
  return moves.map((m) => ({
    ...m,
    x: m.x === -1 ? -1 : m.x - 1,
    y: m.y === -1 ? -1 : m.y - 1,
  }));
}

export function denormalizeMovesToOneBased(moves: MoveInfo[]): MoveInfo[] {
  return moves.map((m) => ({
    ...m,
    x: m.x === -1 ? -1 : m.x + 1,
    y: m.y === -1 ? -1 : m.y + 1,
  }));
}

export function padBoardState(board: BoardState | undefined): BoardState {
  const originalSize = board?.length ?? 0;

  const padded: BoardState = Array.from({ length: 19 }, () =>
    Array(19).fill(null),
  );

  if (board) {
    for (let y = 0; y < originalSize; y++) {
      for (let x = 0; x < originalSize; x++) {
        padded[y][x] = board[y][x];
      }
    }
  }

  return padded;
}
