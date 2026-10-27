// packages/expo-katago/src/logics/analyzeBoard.ts

/**
 * analyzeBoard.ts
 *
 * web-katrain のエンジンコアを Expo から使うための薄いラッパー。
 * 入力は web-katrain の型(BoardState / Move / Player)でそのまま受け取る。
 * 座標も web-katrain と同じ0始まり。変換は呼ぶ側の責務。
 *
 * ================================================================
 * 【入力形式】AnalyzeBoardArgs
 * ================================================================
 *
 * 必須:
 *   currentPlayer  'black' | 'white'  次の手番
 *
 *   board: BoardState
 *   'black' | 'white' | null の二次元配列。
 *   例: [[null,'black',null],['white',null,'black'],[null,null,null]]
 *
 *   moves: Move[]
 *   着手履歴の配列。x, y は0始まり。
 *   例: [{x:3, y:3, player:'black'}, {x:15, y:15, player:'white'}]
 *   ※ パスは x:-1, y:-1 で表現。
 *
 *
 * オプション:
 *   komi            number      コミ（デフォルト: 6.5）
 *   rules           GameRules   'japanese'|'chinese'|'korean'（デフォルト: 'japanese'）
 *   visits          number      MCTS 探索数（デフォルト: 200）
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
 *   scoreLead       number        黒のスコアリード（正=黒有利、負=白有利）🌟
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
 *   moves           候補手リスト（訪問数の多い順）🌟
 *     x, y          number        座標（0始まり）。パスは x:-1, y:-1
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
import {
  AnalyzeBoardArgs,
  AnalyzeResultFields,
  AnalyzeResultFor,
  ModelDownloadProgress,
  ModelLoadStage,
} from "../types/types";
import { MctsSearch } from "../web-katrain/src/engine/katago/analyzeMcts";
import {
  BLACK,
  EMPTY,
  SimPosition,
  StoneColor,
  WHITE,
  playMove,
  setBoardSize,
} from "../web-katrain/src/engine/katago/fastBoard";
import { parseKataGoModelV8 } from "../web-katrain/src/engine/katago/loadModelV8";
import { KataGoModelV8Tf } from "../web-katrain/src/engine/katago/modelV8";
import { BoardSize, BoardState, Move, Player } from "../web-katrain/src/types";
import { readModelData } from "./modelManager";

const playerToColor = (p: Player): StoneColor =>
  p === "black" ? BLACK : WHITE;

// ================================================================
// モデルキャッシュ & ウォームアップ
// ================================================================

/** TFテンソルの待機と破棄をまとめて処理するヘルパー関数 */
const disposeTensors = async (tensors: Record<string, tf.Tensor>) => {
  await Promise.all(Object.values(tensors).map((t) => t.data()));
  Object.values(tensors).forEach((t) => t.dispose());
};

// 読み込み済みのモデル。モデルが1つだけになったので、Mapではなく1個の変数にした。
let cachedModel: KataGoModelV8Tf | null = null;

export const loadModel = async (
  onProgress?: (stage: ModelLoadStage) => void,
): Promise<KataGoModelV8Tf> => {
  if (cachedModel) return cachedModel;

  const buf = await readModelData((p: ModelDownloadProgress) =>
    onProgress?.({ phase: "downloading", loaded: p.loaded, total: p.total }),
  );
  const data = buf[0] === 0x1f && buf[1] === 0x8b ? ungzip(buf) : buf;
  const parsed = parseKataGoModelV8(data);
  const model = new KataGoModelV8Tf(parsed);
  cachedModel = model;

  const TOTAL_WARMUP_STEPS = 2;
  onProgress?.({
    phase: "warming_up",
    step: 0,
    totalSteps: TOTAL_WARMUP_STEPS,
  });

  const spatial = tf.zeros([1, 19, 19, 22], "float32") as tf.Tensor4D;
  const global_ = tf.zeros([1, 19], "float32") as tf.Tensor2D;

  await disposeTensors(model.forward(spatial, global_));
  onProgress?.({
    phase: "warming_up",
    step: 1,
    totalSteps: TOTAL_WARMUP_STEPS,
  });

  await disposeTensors(model.forwardPolicyValue(spatial, global_));
  onProgress?.({
    phase: "warming_up",
    step: 2,
    totalSteps: TOTAL_WARMUP_STEPS,
  });

  spatial.dispose();
  global_.dispose();

  return model;
};

// ================================================================
// 盤面解析メイン処理
// ================================================================
export const analyzeBoard = async <const F extends AnalyzeResultFields>(
  args: AnalyzeBoardArgs & { fields: F },
): Promise<AnalyzeResultFor<F>> => {
  const batchSize = 1;

  const {
    board,
    moves,
    currentPlayer,
    komi = 6.5,
    rules = "japanese",
    visits = 200,
    maxTimeMs = 5000, // 5秒に。
    topK = 10,
    pvLen = 10,
    wideRootNoise = 0.04,
    nnRandomize = true,
    regionOfInterest,
    fields,
  } = args;

  setBoardSize(args.boardSize);

  const previousBoard =
    moves.length >= 1
      ? buildBoardFromMoves(moves.slice(0, -1), board.length as BoardSize)
      : undefined;

  const previousPreviousBoard =
    moves.length >= 2
      ? buildBoardFromMoves(moves.slice(0, -2), board.length as BoardSize)
      : undefined;

  const model = await loadModel();

  const search = await MctsSearch.create({
    model,
    board: padBoardState(board),
    previousBoard: padBoardState(previousBoard),
    previousPreviousBoard: padBoardState(previousPreviousBoard),
    currentPlayer,
    moveHistory: moves,
    komi,
    rules,
    nnRandomize,
    conservativePass: false,
    maxChildren: 50,
    ownershipMode: "root",
    wideRootNoise,
    regionOfInterest: regionOfInterest ?? null,
    useGraphSearch: false,
    rootSymmetryPruning: false,
  });

  await search.run({
    visits,
    maxTimeMs,
    batchSize: batchSize,
  });

  const output = search.getAnalysis({
    topK,
    analysisPvLen: pvLen,
  });

  // ── 注文されたものだけを、結果に入れる ──────────────
  // 左: 注文書のキー / 右: KataGoの出力側の名前
  const rootKeys = {
    winRate: "rootWinRate",
    scoreLead: "rootScoreLead",
    scoreSelfplay: "rootScoreSelfplay",
    scoreStdev: "rootScoreStdev",
    visits: "rootVisits",
    ownership: "ownership",
    ownershipStdev: "ownershipStdev",
    policy: "policy",
  } as const;

  const moveKeys = [
    "winRate",
    "winRateLost",
    "scoreLead",
    "scoreSelfplay",
    "scoreStdev",
    "visits",
    "pointsLost",
    "relativePointsLost",
    "order",
    "prior",
    "pv",
  ] as const;

  const rawOutput = output as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(rootKeys) as (keyof typeof rootKeys)[]) {
    if (fields[key]) result[key] = rawOutput[rootKeys[key]];
  }

  const moveFields = fields.moves;
  if (moveFields) {
    result.moves = output.moves.map((raw) => {
      const m = raw as unknown as Record<string, unknown>;
      // x, y は「その手の住所」なので常に入れる(0始まりのまま)
      const move: Record<string, unknown> = { x: m.x, y: m.y };
      for (const key of moveKeys) {
        if (moveFields[key]) move[key] = m[key];
      }
      return move;
    });
  }

  return result as AnalyzeResultFor<F>;
};


// ================================================================
// katago専用のヘルパー
// ================================================================

// katagoは一つ前、二つ前の盤面も要求するので、作っている。
// usekatagoの引数として要求しても良かったが、面倒かなと思い、ここで用意。
const buildBoardFromMoves = (
  moves: Move[],
  boardSize: BoardSize,
): BoardState => {
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
      if (s === BLACK) return "black";
      if (s === WHITE) return "white";
      return null;
    }),
  );
  return board;
};

// katagoは9路盤を受け取っても、余った部分を埋めて19*19の盤面として渡す必要がある。それをやっている
const padBoardState = (board: BoardState | undefined) => {
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
};
