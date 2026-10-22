// expo/packages/go-core/src/logics/territoryLogics.ts
//
// 点数(地)を数えて、KataGoの分析結果を「仕上げ」る道具。
// 外に出す入口は、finalizeAnalysis(分析直後)とownershipToScoreLead(保存済みを開く時)。

import {
  finalTerritoryScore,
  LocScore,
  territoryScoring,
} from "../goscorer/goscorer";
import { Ownership } from "../types/analysis";
import {
  BLACK,
  Board,
  BoardSize,
  Color,
  Grid,
  KOMI,
  MatchType,
  WHITE,
} from "../types/go";
import { boardToBoard2D, movesToFinalBoard } from "./boardConverters";
import { KataGoCandidate, slimCandidates } from "./candidatesConverter";
import { isBoardUnfinished } from "./endgameLogics";
import { ownershipToDeadStones, quantizeOwnership } from "./ownershipLogics";

// 地計算(goscorer)の本体。
// 地の見込み(ownershipと同じ形: 黒="B" / 白="W" / どちらでもない="." の1次元配列。行優先 y*boardSize+x)と、
// 黒・白それぞれの点数を返す。
//  - 空点: 黒地なら+1、白地なら-1、ダメ・セキなら0
//  - 生きている石: その石の色の符号(黒石=+1、白石=-1)
//  - 死んでいる石: 反対の符号(黒地の中の死んだ白石=+1、白地の中の死んだ黒石=-1)
const scoreTerritory = (
  boardSize: BoardSize,
  board: Board,
  deadStones: Grid[],
  matchType: MatchType,
  blackAgehama: number,
  whiteAgehama: number,
): {
  ownership: Ownership;
  blackScore: number;
  whiteScore: number;
  dames: Grid[];
} => {
  const komi = matchType === 0 ? KOMI : 0; // matchtype0つまり互先なら
  const stones: Color[][] = boardToBoard2D(board, boardSize);
  const markedDead: boolean[][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => false),
  );

  for (const grid of deadStones) {
    const row = Math.floor(grid / boardSize);
    const col = grid % boardSize;
    markedDead[row][col] = true;
  }

  const finalScore = finalTerritoryScore(
    stones,
    markedDead,
    blackAgehama,
    whiteAgehama,
    komi,
  );
  const scoring: LocScore[][] = territoryScoring(stones, markedDead);

  // 最初はぜんぶ空点（"."）の配列を作るよ
  const ownershipArray: ("W" | "." | "B")[] = new Array(
    boardSize * boardSize,
  ).fill(".");

  // 黒地でも白地でもない空点(ダメ・セキ)の場所を入れていく箱
  const dames: Grid[] = [];

  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const grid = i * boardSize + j;
      const stone = board[grid];
      if (stone) {
        // 石がある場合は、死に石かどうかで黒("B")か白("W")かを決めるよ
        const ownSign = stone.color === BLACK ? "B" : "W";
        const oppositeSign = stone.color === BLACK ? "W" : "B";
        ownershipArray[grid] = markedDead[i][j] ? oppositeSign : ownSign;
      } else if (scoring[i][j].isTerritoryFor === BLACK) {
        ownershipArray[grid] = "B";
      } else if (scoring[i][j].isTerritoryFor === WHITE) {
        ownershipArray[grid] = "W";
      } else {
        // 空点なのにどちらの地でもない = ダメ・セキ
        dames.push(grid);
      }
    }
  }

  // 最後に配列をぎゅっと文字列にくっつける
  const ownership: Ownership = ownershipArray.join("") as Ownership;

  return {
    ownership,
    blackScore: finalScore.black,
    whiteScore: finalScore.white,
    dames,
  };
};

// ownership(黒="B" / 白="W" / どちらでもない=".")から、黒視点の目数差を作る。
// 黒の数 − 白の数 − コミ(互先=0のときだけ) − 置き石の補正(2子局以上のときだけ)。+なら黒有利。
// 置き石は盤上の黒石として黒の数に入っているので、その数を引く。
// ただし最初の1子は、互先で黒が最初に打つ1手と同じ扱いなので、引くのは「置き石の数 − 1」。
// (置き石の碁は白から打ち始めるため)
// matchType: 0=互先、1=定先(コミなし・置き石なし)、2以上=その数の置き石。
export const ownershipToScoreLead = (
  ownership: Ownership,
  moves: Grid[],
  matchType: MatchType,
  boardSize: BoardSize,
): number => {
  const komi = matchType === 0 ? KOMI : 0;
  // 文字列を一文字ずつ見て、地（スコア）の合計を計算する
  let ownershipSum = 0;

  const { board, agehama } = movesToFinalBoard(boardSize, matchType, moves);
  for (let i = 0; i < ownership.length; i++) {
    const char = ownership[i];
    const stone = board[i];

    // 黒の空点
    if (char === "B" && stone === null) {
      ownershipSum += 1;
    }
    // 白の空点
    else if (char === "W" && stone === null) {
      ownershipSum -= 1;
    }
    // 死んでる黒石
    else if (char === "W" && stone?.color === BLACK) {
      ownershipSum -= 2; // そこは白の陣地な上に、整地の時、黒地を減らす
    }
    // 死んでる白石
    else if (char === "B" && stone?.color === WHITE) {
      ownershipSum += 2; // そこは黒の陣地な上に、整地の時、白地を減らす
    }
    // "." またはすでに石がある場所は 0 なので何もしない
  }

  // アゲハマも考慮しないとね
  ownershipSum += agehama.black; // ⚠️紛らわしいね...。
  ownershipSum -= agehama.white;

  return ownershipSum - komi;
};

type SettledAnalysis = {
  ownership: Ownership;
  scoreLead: number; // 黒視点、+なら黒有利
  isFinal: boolean; // 終局が確定して、goscorerの結果で上書きしたかどうか
  dames: Grid[];
};

// KataGoの生の分析結果(ownership / scoreLead)を「仕上げ」る。
//
// ownershipから見て終局している(isBoardUnfinishedがfalse)局面だけ、
// goscorerで数えた正確な結果で上書きして、isFinalをtrueにする。
// それ以外は、受け取った値をそのまま返す(=KataGoの見積もりのまま)。
//
// goscorerを使うのは、分析をしている時だけ。保存済みの棋譜を開く時は使わない。
const settleAnalysis = (
  boardSize: BoardSize,
  matchType: MatchType,
  movesSoFar: Grid[],
  ownership: Ownership,
  scoreLead: number,
): SettledAnalysis => {
  const raw: SettledAnalysis = {
    ownership,
    scoreLead,
    isFinal: false,
    dames: [],
  };

  const { board, agehama } = movesToFinalBoard(
    boardSize,
    matchType,
    movesSoFar,
  );

  if (isBoardUnfinished(board, boardSize, ownership, movesSoFar.length)) {
    return raw;
  }

  const deadStones = ownershipToDeadStones(board, ownership);
  const {
    ownership: settledOwnership,
    blackScore,
    whiteScore,
    dames,
  } = scoreTerritory(
    boardSize,
    board,
    deadStones,
    matchType,
    agehama.black,
    agehama.white,
  );

  return {
    ownership: settledOwnership,
    scoreLead: blackScore - whiteScore,
    isFinal: true,
    dames,
  };
};

// 終局が確定した局面の勝率(黒視点、0〜100)。黒の勝ちなら100、白の勝ちなら0、持碁なら50。
const finalWinRate = (scoreLead: number): number => {
  if (scoreLead > 0) return 100;
  if (scoreLead < 0) return 0;
  return 50;
};

type FinalizedAnalysis = {
  ownership: Ownership;
  scoreLead: number;
  winRate: number; // 黒視点、0〜100
  candidates: Grid[];
  isFinal: boolean; // 終局と判定されたか(goscorerで仕上げたか)
  dames: Grid[];
};

// KataGoの生のownershipと勝率を受け取って、仕上がった結果を返す入口。
// 終局しているかどうかの判断(goscorerを使うか、勝率を100/0/50にするか)も、この中でやる。
export const finalizeAnalysis = (
  board: Board,
  boardSize: BoardSize,
  matchType: MatchType,
  movesSoFar: Grid[],
  rawOwnership: ArrayLike<number>,
  winRate: number,
  candidateMoves: KataGoCandidate[],
): FinalizedAnalysis => {
  const quantized = quantizeOwnership(board, rawOwnership);
  const rawScoreLead = ownershipToScoreLead(
    quantized,
    movesSoFar,
    matchType,
    boardSize,
  );
  const settled = settleAnalysis(
    boardSize,
    matchType,
    movesSoFar,
    quantized,
    rawScoreLead,
  );

  const candidates = slimCandidates(candidateMoves, boardSize, settled.isFinal);

  const message = settled.isFinal
    ? `終局してるよ (${movesSoFar.length}手目)`
    : `まだ終局してないよ (${movesSoFar.length}手目)`;

  // 終局してるなら赤、してないなら緑にするよ
  const style = settled.isFinal ? "color: red;" : "color: green;";
  console.log(`%c${message}`, style);

  return {
    ownership: settled.ownership,
    scoreLead: settled.scoreLead,
    winRate: settled.isFinal ? finalWinRate(settled.scoreLead) : winRate,
    candidates,
    isFinal: settled.isFinal,
    dames: settled.dames,
  };
};
