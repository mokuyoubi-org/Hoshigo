import { BoardSize, Grid, MatchType } from "go-core";

type CategoryChoice = {
  candidates: Grid[];
  weight: number;
};

const getRandomElement = <T>(array: T[]): T => {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

const chooseCategory = (choices: CategoryChoice[]): Grid[] => {
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let randomValue = Math.random() * totalWeight;

  for (const choice of choices) {
    if (randomValue < choice.weight) {
      return choice.candidates;
    }
    randomValue -= choice.weight;
  }

  return choices[0].candidates;
};

export const decideBotFirstMove = (
  matchType: MatchType,
  boardSize: BoardSize,
): Grid => {
  if (matchType === 1) {
    return 0;
  }

  // ============================================================
  // 第2フェーズ: 1でまとめたカテゴリに重みをつけていく作業。
  // ============================================================
  let choices: CategoryChoice[] = [];

  if (boardSize === 9) {
    if (matchType === 0) {
      /*
     0,  1,  2,  3,  4,  5,  6,  7,  8,
     9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23, 24, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55, 56, 57, 58, 59, 60, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
      const SANSAN = [20, 24, 56, 60];
      const KOMOKU = [21, 29, 23, 33, 47, 57, 51, 59];
      const HOSHI = [30, 32, 48, 50];
      const MOKUHAZUSHI = [22, 38, 42, 58];
      const TAKAMOKU = [31, 39, 41, 49];
      const TENGEN = [40];
      choices = [
        { candidates: TENGEN, weight: 25 },
        { candidates: HOSHI, weight: 25 },
        { candidates: TAKAMOKU, weight: 20 },
        { candidates: MOKUHAZUSHI, weight: 20 },
        { candidates: KOMOKU, weight: 5 },
        { candidates: SANSAN, weight: 5 },
      ];
    } else if (matchType === 2) {
      /*
     0,  1,  2,  3,  4,  5,  6,  7,  8,
     9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23,  *, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55,  *, 57, 58, 59, 60, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
      const SANSAN = [20, 60];
      const TSUKE = [23, 33, 47, 57];
      const KOMOKU = [21, 29, 51, 59];
      const HOSHI = [30, 50];
      const KATATSUKI_HOSHI = [32, 48];
      const MOKUHAZUSHI = [22, 38, 42, 58];
      const TAKAMOKU = [31, 39, 41, 49];
      const TENGEN = [40];
      choices = [
        { candidates: KATATSUKI_HOSHI, weight: 20 },
        { candidates: MOKUHAZUSHI, weight: 20 },
        { candidates: HOSHI, weight: 15 },
        { candidates: KOMOKU, weight: 15 },
        { candidates: TENGEN, weight: 10 },
        { candidates: TSUKE, weight: 10 },
        { candidates: TAKAMOKU, weight: 5 },
        { candidates: SANSAN, weight: 5 },
      ];
    } else if (matchType === 3) {
      /*
     0,  1,  2,  3,  4,  5,  6,  7,  8,
     9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23,  *, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55,  *, 57, 58, 59,  *, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
      const SANSAN = [20];
      const TSUKE = [23, 33, 47, 57, 51, 59];
      const KOMOKU = [21, 29];
      const HOSHI = [30];
      const KATATSUKI_HOSHI_CENTER = [50];
      const KATATSUKI_HOSHI_SIDE = [32, 48];
      const MOKUHAZUSHI_BETWEEN = [42, 58];
      const MOKUHAZUSHI_FAR = [22, 38];
      const TAKAMOKU_NEAR = [41, 49];
      const TAKAMOKU_FAR = [31, 39];
      const TENGEN = [40];
      choices = [
        { candidates: HOSHI, weight: 15 },
        { candidates: KOMOKU, weight: 15 },
        { candidates: MOKUHAZUSHI_FAR, weight: 10 },
        { candidates: KATATSUKI_HOSHI_SIDE, weight: 10 },
        { candidates: TSUKE, weight: 10 },
        { candidates: MOKUHAZUSHI_BETWEEN, weight: 10 },
        { candidates: TENGEN, weight: 10 },
        { candidates: KATATSUKI_HOSHI_CENTER, weight: 5 },
        { candidates: TAKAMOKU_NEAR, weight: 5 },
        { candidates: TAKAMOKU_FAR, weight: 5 },
        { candidates: SANSAN, weight: 5 },
      ];
    } else if (matchType === 4) {
      /*
     0,  1,  2,  3,  4,  5,  6,  7,  8,
     9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19,  *, 21, 22, 23,  *, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55,  *, 57, 58, 59,  *, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
      const TSUKE = [21, 29, 23, 33, 47, 57, 51, 59];
      const KATATSUKI_HOSHI = [32, 48, 30, 50];
      const MOKUHAZUSHI_BETWEEN = [42, 58, 22, 38];
      const TAKAMOKU = [31, 39, 41, 49];
      const TENGEN = [40];
      choices = [
        { candidates: TSUKE, weight: 30 },
        { candidates: MOKUHAZUSHI_BETWEEN, weight: 20 },
        { candidates: TENGEN, weight: 20 },
        { candidates: KATATSUKI_HOSHI, weight: 20 },
        { candidates: TAKAMOKU, weight: 10 },
      ];
    } else if (matchType === 5) {
      /*
     0,  1,  2,  3,  4,  5,  6,  7,  8,
     9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19,  *, 21, 22, 23,  *, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39,  *, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55,  *, 57, 58, 59,  *, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
      const TSUKE = [21, 29, 23, 33, 47, 57, 51, 59];
      const HOSHI_BETWEEN = [32, 48, 30, 50];
      const MOKUHAZUSHI_BETWEEN = [42, 58, 22, 38];
      choices = [
        { candidates: TSUKE, weight: 40 },
        { candidates: MOKUHAZUSHI_BETWEEN, weight: 40 },
        { candidates: HOSHI_BETWEEN, weight: 20 },
      ];
    }
  } else if (boardSize === 13) {
    if (matchType === 0) {
      choices = [];
    } else if (matchType === 2) {
      choices = [];
    } else if (matchType === 3) {
      choices = [];
    } else if (matchType === 4) {
      choices = [];
    } else if (matchType === 5) {
      choices = [];
    } else if (matchType === 6) {
      choices = [];
    } else if (matchType === 7) {
      choices = [];
    } else if (matchType === 8) {
      choices = [];
    } else if (matchType === 9) {
      choices = [];
    }
  } else if (boardSize === 19) {
    if (matchType === 0) {
      choices = [];
    } else if (matchType === 2) {
      choices = [];
    } else if (matchType === 3) {
      choices = [];
    } else if (matchType === 4) {
      choices = [];
    } else if (matchType === 5) {
      choices = [];
    } else if (matchType === 6) {
      choices = [];
    } else if (matchType === 7) {
      choices = [];
    } else if (matchType === 8) {
      choices = [];
    } else if (matchType === 9) {
      choices = [];
    }
  }

  if (choices.length === 0) {
    const centerGrid = Math.floor((boardSize * boardSize) / 2);
    return centerGrid;
  }

  const selectedCandidates = chooseCategory(choices);
  return getRandomElement(selectedCandidates);
};
