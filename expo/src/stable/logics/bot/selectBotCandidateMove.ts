// selectBotCandidateMove.ts
//
// ─── この関数の責務 ───────────────────────────────────
// KataGoのanalysis結果(候補手リスト)から、手数(moveNumber)と盤サイズに
// 応じた「重み付きランダム」で1手を選ぶ。
//
// 2026/09/11: 最初は「1位の重みtop×減衰率^i」という式で組んでいたが、
// これだと分子・分母の両方にtopが乗って約分されるため、topの値を
// いくら変えても実際の抽選確率(相対比)が一切変わらないというバグが
// あった(社長の指摘で発覚)。数式は「1箇所直したら他も連動する」の
// 裏返しで「意図せず他も変わる/変わらない」事故が起きやすいため、
// 各段階の重み配分は検算しやすい直書きのテーブルに戻した。
//
// 「どの盤サイズの何手目がどの段階(topWeight)に該当するか」だけは、
// 9路を基準に13路=2倍・19路=3倍に間延びさせる機械的な計算にしている
// (ここは「盤が大きいほど揺らぎ区間を伸ばす」という単純な規則なので、
// 数式で持っても事故りにくい)。
// ──────────────────────────────────────────────────

import { AnalyzeResult, ModelId } from "expo-katago";
import { BoardSize } from "go-core";

type CandidateMove = AnalyzeResult["moves"][number];

// 🐱 段階ごとの重み配分。キーは「1位の取り分(%)」、値は[1位,2位,3位,4位,5位]で
//    必ず合計100になるよう手打ちしている(検算のため、意図的に式にしない)。
//    候補手がこれより少ない場合は、配列の先頭から必要な数だけ使う
//    (例: 候補が3つなら先頭3要素だけを使い、その3つの中での相対比になる)。
const WEIGHTS_BY_TOP: Record<number, number[]> = {
  30: [30, 25, 20, 15, 10],
  40: [40, 25, 18, 11, 6],
  50: [50, 22, 15, 9, 4],
  60: [60, 18, 12, 7, 3],
  70: [70, 14, 9, 5, 2],
  80: [80, 10, 6, 3, 1],
  90: [90, 6, 3, 1, 0],
};

// 🐱 9路での、段階の並び。手数が進むごとにこの順で「1位の取り分」が
//    上がっていく。100に達したら揺らぎ終了・常に最善手。
const TOP_WEIGHT_STEPS = [30, 40, 50, 60, 70, 80, 90, 100];

// 9路での、1段階あたりの手数(2,3手目→30、4,5手目→40、…)
const BASE_BUCKET_WIDTH = 2;

// 盤サイズごとの間延び倍率(9路を基準の1とする。13路は2倍、19路は3倍)
const BOARD_SIZE_SCALE: Record<BoardSize, number> = {
  9: 1,
  13: 2,
  19: 3,
};

// 🐱 最善手とのwinRate差(黒視点、0〜1)がこれを超える候補手は、
//    「弱すぎる」とみなして抽選から除外する。
const WINRATE_CUTOFF = 0.03;

// パス判定・端っこ判定。isValidCandidateと選択ロジック本体の両方から
// 使うので、関数の外(モジュールレベル)に置いている。
const isPass = (m: CandidateMove) => m.x === -1 && m.y === -1;
const isEdge = (m: CandidateMove) => m.x === 1 || m.y === 1;

// 候補手が抽選対象として有効かどうかを判定する。
// 禁止条件を上から順番に弾いていく書き方にして、
// 「パスなら禁止」「端っこは最善手以外禁止」を素直に読めるようにしている。
function isValidCandidate(
  m: CandidateMove,
  bestMove: CandidateMove,
  boardSize: BoardSize,
  modelId: ModelId,
): boolean {
  if (isPass(m)) return false; // パスは常に禁止
  if (isEdge(m) && m !== bestMove && boardSize === 9 && modelId === "b18")
    return false; // b18の9路盤での変な端っこ打ちは禁止しておく
  return true;
}

// moveNumber(これから打とうとしている手が何手目か、1-indexed)と盤サイズ
// から、その時点の「1位の取り分」を求める。
function getTopWeight(moveNumber: number, boardSize: BoardSize): number {
  const scale = BOARD_SIZE_SCALE[boardSize] ?? 1;
  const bucketWidth = BASE_BUCKET_WIDTH * scale;
  const bucketIndex = Math.floor((moveNumber - 2) / bucketWidth);

  if (bucketIndex < 0) return TOP_WEIGHT_STEPS[0]; // 呼ばれない想定だが保険
  if (bucketIndex >= TOP_WEIGHT_STEPS.length) {
    return TOP_WEIGHT_STEPS[TOP_WEIGHT_STEPS.length - 1];
  }
  return TOP_WEIGHT_STEPS[bucketIndex];
}

export function selectBotCandidateMove(
  moves: AnalyzeResult["moves"],
  moveCount: number,
  boardSize: BoardSize,
  modelId: ModelId,
): CandidateMove {
  const bestMove = moves[0];

  // moveCountは「これまでに打たれた手の数」、moveNumberは「これから
  // 打とうとしている手が何手目か」(1-indexed)。moveCount=1(2手目を
  // 打とうとしている)ならmoveNumber=2。
  const moveNumber = moveCount + 1;

  // パスは禁止。また、最善手でない場合の端っこ(xyいずれかが1)も禁止。
  const validMoves = moves.filter((m) =>
    isValidCandidate(m, bestMove, boardSize, modelId),
  );
  console.log(
    `🔍 [selectBotCandidateMove] moveNumber=${moveNumber}(${boardSize}路): 入力moves=${JSON.stringify(moves)} / bestMove=${JSON.stringify(bestMove)} / validMoves=${JSON.stringify(validMoves)}`,
  );

  if (validMoves.length === 0) return bestMove;

  const topWeight = getTopWeight(moveNumber, boardSize);

  // 揺らぎ区間を過ぎたら常に最善手
  if (topWeight >= 100) {
    console.log(
      `🎲 [selectBotCandidateMove] moveNumber=${moveNumber}(${boardSize}路): 揺らぎ区間終了、最善手を選択`,
    );
    return bestMove;
  }

  // 最善手とのwinRate差がWINRATE_CUTOFF以内の候補手だけを残す
  const strongEnoughMoves = validMoves.filter(
    (m) => Math.abs(m.winRate - bestMove.winRate) <= WINRATE_CUTOFF,
  );

  const candidateMoves = strongEnoughMoves.slice(0, 5);
  const weights = WEIGHTS_BY_TOP[topWeight].slice(0, candidateMoves.length);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // 重みに基づいてランダムに1手選択
  let randomVal = Math.random() * totalWeight;
  for (let i = 0; i < candidateMoves.length; i++) {
    if (randomVal < weights[i]) {
      console.log(
        `🎲 [selectBotCandidateMove] moveNumber=${moveNumber}(${boardSize}路): ${i + 1}番目を選択(重み${weights[i]}/${totalWeight}, winRate差${Math.abs(candidateMoves[i].winRate - bestMove.winRate).toFixed(3)})`,
      );
      return candidateMoves[i];
    }
    randomVal -= weights[i];
  }

  // 🥶 浮動小数点誤差などで万一ループを抜けた場合の保険
  return candidateMoves[candidateMoves.length - 1];
}
