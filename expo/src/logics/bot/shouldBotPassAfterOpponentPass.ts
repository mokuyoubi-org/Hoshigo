import { MoveInfo } from "expo-katago"; // ⚠️exportされていなければ import 元を調整してください
import { BLACK, Color, Grid, PASS_GRID } from "go-core";

// ボット視点のscoreLeadがこの値以内の差なら「同じ価値」とみなす(目数の誤差吸収)
const SCORE_TOLERANCE = 0.5;

const isPassMove = (m: MoveInfo) => m.x === -1 || m.y === -1;

/**
 * 相手が直前にパスしていて、かつ最善手を打ってもパスより得をしない場合にtrueを返す。
 * scoreLeadは「黒視点」(正=黒有利)なので、ボット視点に直して比較する。
 */
export const shouldBotPassAfterOpponentPass = (
  botColor: Color,
  movesSoFar: Grid[],
  candidates: MoveInfo[],
): boolean => {
  // 相手が直前にパスしたか？
  const lastMove = movesSoFar[movesSoFar.length - 1];
  if (!lastMove || lastMove !== PASS_GRID) return false; // ⚠️Grid型のパス判定は実装に合わせて調整

  const best = candidates[0]; // 先頭が最善手(訪問数順)
  if (!best) return false;

  // 最善手自体がパスなら、そのままパスでOK
  if (isPassMove(best)) return true;

  // パス候補の評価を探す(無ければ比較できないので通常どおり打つ)
  const pass = candidates.find(isPassMove);
  if (!pass) return false;

  // 黒視点 → ボット視点に変換(黒なら+1、白なら-1を掛ける)
  const sign = botColor === BLACK ? 1 : -1;
  const bestLead = best.scoreLead * sign;
  const passLead = pass.scoreLead * sign;

  // パスしても、最善手と(ほぼ)同じ以上の目数なら、パスを選ぶ
  return passLead >= bestLead - SCORE_TOLERANCE;
};
