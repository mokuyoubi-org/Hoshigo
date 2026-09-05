import { MatchType, Color, isNoOkiishi, BLACK, WHITE } from "../types/go";

export function getColorToMove(matchType: MatchType, movesCount: number): Color {
  const isBlackStart = isNoOkiishi(matchType);
  const isEven = movesCount % 2 === 0;
  return isBlackStart ? (isEven ? BLACK : WHITE) : (isEven ? WHITE : BLACK);
}