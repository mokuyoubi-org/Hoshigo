import { Grid, MatchType, BoardSize } from "@/packages/go-core/src";

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
  // 第一フェーズ: まとめ作業。とりあえず同じ意味を持つ場所をまとめるだけ。
  // ============================================================
  let SANSAN: Grid[] = [];
  let KOMOKU: Grid[] = [];
  let HOSHI: Grid[] = [];
  let MOKUHAZUSHI: Grid[] = [];
  let TAKAMOKU: Grid[] = [];
  let TENGEN: Grid[] = [];

  if (boardSize === 9) {
    /*
    0,  1,  2,  3,  4,  5,  6,  7,  8,
    9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19,  *, 21, 22, 23,  *, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, *, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55,  *, 57, 58, 59,  *, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
    SANSAN = [20, 24, 56, 60];
    KOMOKU = [21, 29, 23, 33, 46, 57, 51, 59];
    HOSHI = [30, 32, 48, 50];
    MOKUHAZUSHI = [22, 38, 42, 58];
    TAKAMOKU = [31, 39, 41, 49];
    TENGEN = [40];
  } else if (boardSize === 13) {
    /*
      0,   1,   2,   3,   4,   5,   6,   7,   8,   9,  10,  11,  12,
     13,  14,  15,  16,  17,  18,  19,  20,  21,  22,  23,  24,  25,
     26,  27,  28,  29,  30,  31,  32,  33,  34,  35,  36,  37,  38,
     39,  40,  41,  42,  43,  44,  45,  46,  47,  48,  49,  50,  51,
     52,  53,  54,  55,  56,  57,  58,  59,  60,  61,  62,  63,  64,
     65,  66,  67,  68,  69,  70,  71,  72,  73,  74,  75,  76,  77,
     78,  79,  80,  81,  82,  83,  84,  85,  86,  87,  88,  89,  90,
     91,  92,  93,  94,  95,  96,  97,  98,  99, 100, 101, 102, 103,
    104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
    117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
    130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142,
    143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155,
    156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168
   */
    TENGEN = [84];
    HOSHI = [42, 48, 120, 126];
    KOMOKU = [29, 35, 41, 51, 117, 127, 133, 139];
    TAKAMOKU = [30, 34, 54, 62, 106, 114, 134, 138];
    MOKUHAZUSHI = [28, 36, 40, 50, 118, 128, 132, 140];
    SANSAN = [29, 35, 133, 139];
  } else if (boardSize === 19) {
    /*
      0,   1,   2,   3,   4,   5,   6,   7,   8,   9,  10,  11,  12,  13,  14,  15,  16,  17,  18,
     19,  20,  21,  22,  23,  24,  25,  26,  27,  28,  29,  30,  31,  32,  33,  34,  35,  36,  37,
     38,  39,  40,  41,  42,  43,  44,  45,  46,  47,  48,  49,  50,  51,  52,  53,  54,  55,  56,
     57,  58,  59,  60,  61,  62,  63,  64,  65,  66,  67,  68,  69,  70,  71,  72,  73,  74,  75,
     76,  77,  78,  79,  80,  81,  82,  83,  84,  85,  86,  87,  88,  89,  90,  91,  92,  93,  94,
     95,  96,  97,  98,  99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
    114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
    133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151,
    152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170,
    171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189,
    190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208,
    209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227,
    228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246,
    247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265,
    266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284,
    285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303,
    304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322,
    323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341,
    342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360
   */
    TENGEN = [180];
    HOSHI = [60, 72, 288, 300];
    KOMOKU = [59, 61, 71, 73, 287, 289, 299, 301];
    TAKAMOKU = [41, 77, 93, 267, 283, 319, 335, 337];
    MOKUHAZUSHI = [58, 62, 70, 74, 286, 290, 298, 302];
    SANSAN = [40, 78, 282, 320];
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
      choices = [
        { candidates: TENGEN, weight: 30 },
        { candidates: HOSHI, weight: 30 },
        { candidates: KOMOKU, weight: 15 },
        { candidates: TAKAMOKU, weight: 15 },
        { candidates: MOKUHAZUSHI, weight: 5 },
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
      choices = [
        { candidates: [], weight: 40 },
        { candidates: TENGEN, weight: 60 },
      ];
    } else if (matchType === 3) {
      /*
     0,  1,  2,  3,  4,  5,  6,  7,  8,
     9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23,  *, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39,  *, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53,
    54, 55,  *, 57, 58, 59, 60, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80
   */
      choices = [
        { candidates: KOMOKU, weight: 50 },
        { candidates: TENGEN, weight: 50 },
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
      choices = [
        { candidates: HOSHI, weight: 50 },
        { candidates: KOMOKU, weight: 50 },
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
      choices = [{ candidates: TENGEN, weight: 100 }];
    }
  } else if (boardSize === 13) {
    if (matchType === 0) {
      choices = [
        { candidates: HOSHI, weight: 40 },
        { candidates: KOMOKU, weight: 40 },
        { candidates: TENGEN, weight: 20 },
      ];
    } else if (matchType === 2) {
      choices = [
        { candidates: HOSHI, weight: 50 },
        { candidates: TENGEN, weight: 50 },
      ];
    } else if (matchType === 3) {
      choices = [
        { candidates: KOMOKU, weight: 60 },
        { candidates: TENGEN, weight: 40 },
      ];
    } else if (matchType === 4) {
      choices = [
        { candidates: HOSHI, weight: 50 },
        { candidates: KOMOKU, weight: 50 },
      ];
    } else if (matchType === 5) {
      choices = [{ candidates: TENGEN, weight: 100 }];
    } else if (matchType === 6) {
      choices = [
        { candidates: HOSHI, weight: 30 },
        { candidates: TENGEN, weight: 70 },
      ];
    } else if (matchType === 7) {
      choices = [
        { candidates: KOMOKU, weight: 30 },
        { candidates: TENGEN, weight: 70 },
      ];
    } else if (matchType === 8) {
      choices = [
        { candidates: TAKAMOKU, weight: 30 },
        { candidates: TENGEN, weight: 70 },
      ];
    } else if (matchType === 9) {
      choices = [
        { candidates: SANSAN, weight: 30 },
        { candidates: TENGEN, weight: 70 },
      ];
    }
  } else if (boardSize === 19) {
    if (matchType === 0) {
      choices = [
        { candidates: HOSHI, weight: 40 },
        { candidates: KOMOKU, weight: 40 },
        { candidates: TENGEN, weight: 20 },
      ];
    } else if (matchType === 2) {
      choices = [
        { candidates: HOSHI, weight: 60 },
        { candidates: KOMOKU, weight: 40 },
      ];
    } else if (matchType === 3) {
      choices = [
        { candidates: KOMOKU, weight: 60 },
        { candidates: TAKAMOKU, weight: 40 },
      ];
    } else if (matchType === 4) {
      choices = [
        { candidates: HOSHI, weight: 50 },
        { candidates: KOMOKU, weight: 50 },
      ];
    } else if (matchType === 5) {
      choices = [{ candidates: TENGEN, weight: 100 }];
    } else if (matchType === 6) {
      choices = [
        { candidates: HOSHI, weight: 50 },
        { candidates: TENGEN, weight: 50 },
      ];
    } else if (matchType === 7) {
      choices = [
        { candidates: KOMOKU, weight: 50 },
        { candidates: TENGEN, weight: 50 },
      ];
    } else if (matchType === 8) {
      choices = [
        { candidates: TAKAMOKU, weight: 50 },
        { candidates: TENGEN, weight: 50 },
      ];
    } else if (matchType === 9) {
      choices = [
        { candidates: SANSAN, weight: 50 },
        { candidates: TENGEN, weight: 50 },
      ];
    }
  }

  if (choices.length === 0) {
    const centerGrid = Math.floor((boardSize * boardSize) / 2);
    return centerGrid;
  }

  const selectedCandidates = chooseCategory(choices);
  return getRandomElement(selectedCandidates);
};
