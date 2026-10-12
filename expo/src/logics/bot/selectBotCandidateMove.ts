// selectBotCandidateMove.ts
//
// ─── この関数の責務 ───────────────────────────────────
// KataGoのanalysis結果(候補手リスト)から、bot・盤サイズ・手数に応じた
// 「重み付きランダム」で1手を選ぶ。
//
// 重みの表そのものは botMoveWeights.ts にハードコードしてあり、
// このファイルは「表を引いて、くじ引きをする」ことだけを担当する。
// ──────────────────────────────────────────────────

import { AnalyzeResult } from "expo-katago";
import { BoardSize } from "go-core";
import {
  BOT_SCORELEAD_CUTOFF,
  BOT_WINRATE_CUTOFF,
  getWeightRow,
} from "@/src/logics/bot/botMoveWeights";
import { BotUsername } from "@/src/constants/botProfiles";

type CandidateMove = AnalyzeResult["moves"][number];

// 抽選の対象にする候補手の最大数(元はtop5だったが10に変更)
const CANDIDATE_COUNT = 10;

// パス判定・端っこ判定。isValidCandidateから使うので、
// 関数の外(モジュールレベル)に置いている。
const isPass = (m: CandidateMove) => m.x === -1 && m.y === -1;
const isNearEdge = (m: CandidateMove) =>
  m.x === 1 ||
  m.y === 1 ||
  m.x === 9 ||
  m.y === 9 ||
  m.x === 2 ||
  m.y === 2 ||
  m.x === 8 ||
  m.y === 8;

// 候補手が抽選対象として有効かどうかを判定する。
// 禁止条件を上から順番に弾いていく書き方にして、
// 「パスなら禁止」「端っこは最善手以外禁止」を素直に読めるようにしている。
const isValidCandidate = (
  m: CandidateMove,
  bestMove: CandidateMove,
  botUsername: BotUsername,
  boardSize: BoardSize,
): boolean => {
  if (isPass(m)) return false; // パスは常に禁止
  if (
    isNearEdge(m) &&
    m !== bestMove &&
    m !== bestMove
    // &&
    // botUsername === "bot3" &&
    // boardSize === 9
  )
    return false; // 変な端っこ打ちは禁止しておく。ただし最善手なら許可
  return true;
};

export const selectBotCandidateMove = (
  moves: AnalyzeResult["moves"],
  moveCount: number,
  boardSize: BoardSize,
  botUsername: BotUsername,
): CandidateMove => {
  const bestMove = moves[0];

  // これから打とうとしている手が何手目か(1-indexed)
  const moveNumber = moveCount + 1;

  // 🐱 どの出口から返す場合でも、最後にここを通してログを出す。
  //    順位は「抽選用に絞り込んだ後のリスト」ではなく、KataGoが返した
  //    元のmoves(パスや弱い手を除く前)での順位にしている。
  const finish = (chosen: CandidateMove, reason: string): CandidateMove => {
    if (__DEV__) {
      const rank = moves.indexOf(chosen) + 1;
      console.log(
        `[bot] ${botUsername} / ${boardSize}路 / ${moveNumber}手目: ` +
          `${rank}位の候補手を選択 (${reason})`,
      );
    }
    return chosen;
  };

  // 表を引く。表に無い(11手目以降)なら常に最善手。
  const weightRow = getWeightRow(botUsername, boardSize, moveNumber);
  if (weightRow === null) {
    return finish(bestMove, "表の範囲外=最善手固定");
  }

  const winRateCutoff = BOT_WINRATE_CUTOFF[botUsername];
  const scoreLeadCutoff = BOT_SCORELEAD_CUTOFF[botUsername];

  // 🐱 ここが修正ポイント。
  //    先にKataGoの元の順位(上位CANDIDATE_COUNT個)へ重みを結びつけておき、
  //    そのあとで失格者を除く。こうすると失格者が出ても順位は繰り上がらず、
  //    「6位以下は重み0」がちゃんと守られる。
  const entries = moves
    .slice(0, CANDIDATE_COUNT)
    .map((move, i) => ({ move, weight: weightRow[i] ?? 0 }))
    .filter(
      ({ move, weight }) =>
        weight > 0 && // 重み0の順位は最初から抽選に入れない
        isValidCandidate(move, bestMove, botUsername, boardSize) && // パス・端っこ禁止
        Math.abs(move.winRate - bestMove.winRate) <= winRateCutoff && // 勝率を下げすぎる手を除外
        Math.abs(move.scoreLead - bestMove.scoreLead) <= scoreLeadCutoff, // スコアリードを減らしすぎる手を除外
    );

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

  // 抽選対象が1つも残らなかったら、bestMoveを返す
  if (entries.length === 0 || totalWeight <= 0) {
    return finish(bestMove, "抽選対象が0件");
  }

  // 重みに基づいてランダムに1手選択
  let randomVal = Math.random() * totalWeight;
  for (const { move, weight } of entries) {
    if (randomVal < weight) {
      return finish(
        move,
        `抽選: 候補${entries.length}個, 重み${weight}/${totalWeight}`,
      );
    }
    randomVal -= weight;
  }

  // 万が一ループを抜けてもundefinedにならないよう、最後の候補にフォールバックする
  return finish(entries[entries.length - 1].move, "抽選のフォールバック");
};
