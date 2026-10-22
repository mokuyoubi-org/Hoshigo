// expo/packages/go-core/src/logics/ownershipLogics.ts
//
// ownership("BBW.."の文字列。黒="B" / 白="W" / どちらでもない=".")を扱う道具。
// ⚠️ここからは、他のlogicsファイルをimportしない(ぐるぐる回る読み込みを防ぐため)。

import { Ownership, RecordAnalysis } from "../types/analysis";
import { BLACK, Board, BoardSize, GoString, Grid, WHITE } from "../types/go";

// ownership平均の閾値。3値化(toTernary)で使う。
// (超えたら「相手に取られている」とみなす)
const DEAD_STONE_OWNERSHIP_THRESHOLD = 0.5;

// Board からユニークな GoString 一覧を取得する
const getGoStrings = (board: Board): GoString[] => {
  const seen = new Set<GoString>();
  for (const goString of Object.values(board)) {
    if (goString !== null) seen.add(goString);
  }
  return Array.from(seen);
};

// 盤面とownershipから死に石を判定する
// ownershipは連(GoString)単位で値が揃っている前提(quantizeOwnershipかgoscorerを通した値)。
// なので、連の代表の石1個を見れば、その連が死んでいるか分かる。
export const ownershipToDeadStones = (
  board: Board,
  ownership: Ownership,
): Grid[] => {
  const deadStones: Grid[] = [];
  for (const goString of getGoStrings(board)) {
    const representativeStone = goString.stones.values().next().value;
    if (representativeStone === undefined) continue;

    const char = ownership[representativeStone];
    const isDead =
      (goString.color === BLACK && char === "W") ||
      (goString.color === WHITE && char === "B");

    if (isDead) deadStones.push(...goString.stones);
  }
  return deadStones;
};

// ownershipの値1つを、保存用の3値("B" / "." / "W")にする。
const toTernary = (value: number): "W" | "." | "B" => {
  if (value >= DEAD_STONE_OWNERSHIP_THRESHOLD) return "B";
  if (value <= -DEAD_STONE_OWNERSHIP_THRESHOLD) return "W";
  return ".";
};

// 保存用に、ownershipを3値("B" / "." / "W")の文字列にする。
//  - 空点: その点だけの値で3値化する
//  - 石: 連(GoString)の構成石のownership平均で3値化して、連の全員を同じ値にする
export const quantizeOwnership = (
  board: Board,
  ownership: ArrayLike<number>, // 🌟ここだけはArrayLike<number>で正しい
): Ownership => {
  // まず各点を単純に3値化して、配列を作ってから文字列に結合するよ
  const ternaryArray: ("W" | "." | "B")[] = Array.from(ownership, toTernary);

  for (const goString of getGoStrings(board)) {
    const stoneIndexes = [...goString.stones];
    let ownershipSum = 0;
    for (const idx of stoneIndexes) {
      ownershipSum += ownership[idx];
    }
    const value = toTernary(ownershipSum / stoneIndexes.length);
    for (const idx of stoneIndexes) {
      ternaryArray[idx] = value;
    }
  }

  // 配列を1個の文字列に合体させる
  return ternaryArray.join("") as Ownership;
};

// 「この局面の ownership(分析キャッシュに保存されている地の予想)があれば返す。なければ null を返す」だけ。
// 地の見込みをもらう唯一の窓口。確定した終局局面のownershipは、保存時に
// goscorerの結果で上書き済みなので、確定か暫定かを呼び出し側が気にする必要はない。
// 画面側は、null かどうかだけを見て「地を出す/出さない」を決めればいい。
// 「ない」は必ず null で表す(全部0で「ない」を表さない)。
// ownershipが空の配列(分析が無い局面の既定値)や、盤面の大きさと合わない場合も「ない」として扱う。
export const getDisplayOwnership = (
  boardSize: BoardSize,
  board: Board | undefined,
  analysis: RecordAnalysis | null | undefined,
  index: number,
): Ownership | null => {
  const ownership = analysis?.pos?.[index]?.ownership;
  if (!ownership || ownership.length !== boardSize * boardSize || !board) {
    return null;
  }
  return ownership;
};
