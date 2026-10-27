// expo/src/logics/bot/botSelectMove.ts
//
// ─── この関数の責務 ───────────────────────────────────
// botが次に打つ手(パスを含む)を、1つ決める。
//  1. 終局と判定されていて、直前の相手の手がパスなら、パスする。
//     ただし、パスした後の局面も終局と判定されるかを確かめる(isFinalAfterPass)。
//     判定されないなら、最初の終局判定が誤りなので、パスしない。
//  2. パスしない場合は、KataGoの候補手から、bot・盤サイズ・手数に応じた
//     「重み付きランダム」で1手選ぶ。候補が1つも無ければ、パスする。
//
// 重みの表そのものは botMoveWeights.ts にハードコードしてある。
// KataGoを呼ぶのはこのファイルの仕事ではない。パス後の局面の確認は、
// 呼び出し側(useBotMove)から isFinalAfterPass として渡してもらい、必要な時だけ呼ぶ。
// ──────────────────────────────────────────────────

import { BotUsername } from "@/src/constants/botProfiles";
import { getWeightRow } from "@/src/logics/bot/sub/botMoveWeights";
import { BoardSize, Grid, MatchType, PASS_GRID } from "go-core";
import { decideBotFirstMove } from "./sub/decideBotFirstMove";

// 直前の相手の手がパスだったか
const didOpponentPass = (movesSoFar: Grid[]): boolean =>
  movesSoFar[movesSoFar.length - 1] === PASS_GRID;

// 候補手から1手を選ぶ(重み付きランダム)。
// moves は、finalizeAnalysis(slimCandidates)で取捨選択が終わった手。先頭が最善手。
// ここでは重みでくじ引きするだけで、手を落とす判断はしない。
const pickMove = (
  moves: Grid[],
  moveCount: number,
  boardSize: BoardSize,
  botUsername: BotUsername,
  matchType: MatchType,
): Grid => {
  // 初手はハードコードされた手を選ぶ。
  // なぜそうするかというと、手をバラけさせるため。
  if (moveCount === 0) {
    return decideBotFirstMove(matchType, boardSize);
  }

  // これから打とうとしている手が何手目か(1-indexed)
  const moveNumber = moveCount + 1;

  // 候補が1つも無い(KataGoの候補がパスだけだった時など)ならパスする。
  if (moves.length === 0) {
    console.log(
      `[bot] ${botUsername} / ${boardSize}路 / ${moveNumber}手目: 候補手が0件なのでパス`,
    );
    return PASS_GRID;
  }

  const bestMove = moves[0];

  // 🐱 どの出口から返す場合でも、最後にここを通してログを出す。
  //    順位は、slimCandidatesが残した手のリストの中での順位。
  const finish = (chosen: Grid, reason: string): Grid => {
    const rank = moves.indexOf(chosen) + 1;
    console.log(
      `[bot] ${botUsername} / ${boardSize}路 / ${moveNumber}手目: ` +
        `${rank}位の候補手を選択 (${reason})`,
    );
    return chosen;
  };

  // 表を引く。表に無い(11手目以降)なら常に最善手。
  const weightRow = getWeightRow(botUsername, boardSize, moveNumber);
  if (weightRow === null) {
    return finish(bestMove, "表の範囲外=最善手固定");
  }

  // 順位(並びの何番目か)に重みを結びつける。重み0の順位は抽選に入れない。
  const entries = moves
    .map((grid, i) => ({ grid, weight: weightRow[i] ?? 0 }))
    .filter(({ weight }) => weight > 0);

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

  // 抽選対象が1つも残らなかったら、bestMoveを返す
  if (entries.length === 0 || totalWeight <= 0) {
    return finish(bestMove, "抽選対象が0件");
  }

  // 重みに基づいてランダムに1手選択
  let randomVal = Math.random() * totalWeight;
  for (const { grid, weight } of entries) {
    if (randomVal < weight) {
      return finish(
        grid,
        `抽選: 候補${entries.length}個, 重み${weight}/${totalWeight}`,
      );
    }
    randomVal -= weight;
  }

  // 万が一ループを抜けてもundefinedにならないよう、最後の候補にフォールバックする
  return finish(entries[entries.length - 1].grid, "抽選のフォールバック");
};

type BotSelectMoveArgs = {
  dames: Grid[];
  candidates: Grid[]; // KataGoの候補手(先頭が最善手)。空ならパスする
  movesSoFar: Grid[]; // 今の局面までの手の並び
  isFinal: boolean; // 今の局面が終局と判定されたか(KataGoTaskResult.isFinal)
  boardSize: BoardSize;
  matchType: MatchType;
  botUsername: BotUsername;
  // 「パスした後の局面」を分析して、終局と判定されるかを返す。失敗した時は false。
  // 終局と判定されていて、相手がパスした直後の時だけ呼ばれる。
  isFinalAfterPass: () => Promise<boolean>;
};

// botが次に打つ手(パスを含む)を決める。
export const botSelectMove = async ({
  dames,
  candidates,
  movesSoFar,
  isFinal,
  boardSize,
  matchType,
  botUsername,
  isFinalAfterPass,
}: BotSelectMoveArgs): Promise<Grid> => {
  const moveCount = movesSoFar.length;

  // 1. 終局と判定されていて、相手が直前にパスしたなら、パスする。
  //    (パスした後の局面も終局と判定された時だけ。2段階確認)
  if (isFinal && didOpponentPass(movesSoFar)) {
    if (await isFinalAfterPass()) {
      console.log(
        `[bot] ${botUsername}: 相手がパスして、パス後も終局と判定されたので、パスする`,
      );
      return PASS_GRID;
    }
    console.log(
      `[bot] ${botUsername}: 終局と判定されたが、パス後の局面が未終局と判定されるので、パスせず打つ`,
    );
  }

  if (!isFinal && candidates[0] === PASS_GRID) {
    console.log(
      `[bot] ${botUsername}: KataGoの最善手はパスだが、未終局と判定されたので打つ`,
    );
  }

  // 2. 候補手から1手選ぶ(候補が0件ならパスになる)
  const selectedMove = pickMove(
    candidates,
    moveCount,
    boardSize,
    botUsername,
    matchType,
  );

  return selectedMove;
};
