// useTerritoryCalculation.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 盤面編集モード専用。「今のboardで地計算したらどうなるか」をKataGoに
// 聞いて、死に石判定→territoryBoard生成→勝敗結果文字列まで1回でまとめる。
// useEndgameAnalysisとterritoryLogics.generateTerritoryBoardを束ねる
// だけの薄い層で、KataGo呼び出し自体の責務はuseEndgameAnalysisに委譲する。
// ──────────────────────────────────────────────────

import { useRef, useState } from "react";
import {
  Board,
  BoardSize,
  generateTerritoryBoard,
  Grid,
  MatchType,
  TerritoryBoard,
} from "expo-goband";
import { useEndgameAnalysis } from "./useBotCalculation";

export function useTerritoryCalculation(
  boardSize: BoardSize,
  matchType: MatchType,
) {
  const { analyzeTerritory } = useEndgameAnalysis();
  const isCalculatingRef = useRef(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateTerritory = async (
    board: Board,
    movesSoFar: Grid[],
    blackAgehama: number,
    whiteAgehama: number,
  ): Promise<{
    territoryBoard: TerritoryBoard;
    result: string;
    deadStones: Grid[];
  } | null> => {
    if (isCalculatingRef.current) return null;
    isCalculatingRef.current = true;
    setIsCalculating(true);
    try {
      const deadStones = await analyzeTerritory(
        board,
        movesSoFar,
        matchType,
        boardSize,
      );
      const { territoryBoard, result } = generateTerritoryBoard(
        boardSize,
        board,
        deadStones,
        matchType,
        blackAgehama,
        whiteAgehama,
      );
      return { territoryBoard, result, deadStones };
    } finally {
      isCalculatingRef.current = false;
      setIsCalculating(false);
    }
  };

  return { calculateTerritory, isCalculating };
}