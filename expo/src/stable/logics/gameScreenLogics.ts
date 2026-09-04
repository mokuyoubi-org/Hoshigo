// logics/gameScreenLogics.ts
import {
  BLACK,
  BoardSize,
  Color,
  isNoOkiishi,
  MatchType,
  PASS_GRID,
  WHITE,
} from "expo-goband";

export type GameScreenParams = {
  matchId: string;
  boardSize: string;
  matchType: string;
  moves: string;
  myColor: string;
  oppUsername: string;
  oppRating: string;
  oppIconIndex: string;
  mySeconds: string;
  oppSeconds: string;
  botMatch: string;
};

// Partial を使って undefined が来ても大丈夫にする
export function parseGameParams(params: Partial<GameScreenParams>) {
  // 1. JSON.parse はエラーが起きやすいから try-catch で守る
  let movesInt: number[] = [];
  try {
    movesInt = params.moves ? JSON.parse(params.moves) : [];
  } catch {
    movesInt = [];
  }

  // 2. 数値変換も undefined の時は 0 に落とし込む
  const matchId = Number(params.matchId ?? 0);
  const matchType = Number(params.matchType ?? 0) as MatchType;
  const myColor: Color = params.myColor === "black" ? BLACK : WHITE;
  const oppColor: Color = myColor === WHITE ? BLACK : WHITE;
  const boardSize = Number(params.boardSize ?? 9) as BoardSize;
  const botMatch = params.botMatch === "true";

  return {
    matchId,
    matchType,
    movesInt,
    myColor,
    oppColor,
    boardSize,
    botMatch,
    oppUsername: params.oppUsername ?? "",
    oppRating: Number(params.oppRating ?? 0),
    oppIconIndex: Number(params.oppIconIndex ?? 0),
  };
}

export function getPassState(
  currentIndex: number,
  moveHistory: number[],
  matchType: MatchType,
) {
  const currentMove = moveHistory[currentIndex - 1];
  const isCurrentMovePass = currentMove === PASS_GRID;
  const isNormalOrder = isNoOkiishi(matchType);

  const isBlackPass =
    isCurrentMovePass &&
    ((currentIndex % 2 === 1 && isNormalOrder) ||
      (currentIndex % 2 === 0 && !isNormalOrder));

  const isWhitePass =
    isCurrentMovePass &&
    ((currentIndex % 2 === 0 && isNormalOrder) ||
      (currentIndex % 2 === 1 && !isNormalOrder));

  return { isBlackPass, isWhitePass };
}
