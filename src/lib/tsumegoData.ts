// TsumegoData.ts
// 詰碁のデータ定義とサンプルデータ

export type Color = "black" | "white";

export type GoNode = {
  move: string; // "p" とか "3,2", "1,1" etc.
  next: GoNode[];
  status?: "correct" | "wrong"; // 終端ノードでなければundefined
  color: Color; // 'black' | 'white'
  comment: string; // 「せいかい！」とか、「こう打たれたらどうする？」とか
};

export type Tsumego = {
  id: number;
  title: string; // タイトル。「簡単そうだけど。。。」とか
  difficulty: "easy" | "medium" | "hard";
  board: number[][];
  nextMoveColor: Color; // 黒先の問題か白先の問題かが決まる
  sequence: GoNode[];
  description?: string; // 「黒先白死だよ！」とか。
  boardSize: number;
};

// サンプル詰碁データ
export const SHIROGUMI_TSUMEGO: Tsumego[] = [
  {
    id: 0,
    title: "石をとろう",
    difficulty: "easy",
    nextMoveColor: "black",
    description: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 2, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    sequence: [
      {
        move: "4,3",
        color: "black",
        comment: "せいかい！\n上下左右をかこむことで○をとれたね",
        status: "correct",
        next: [],
      },
    ],
    boardSize: 5,
  },
  {
    id: 1,
    title: "アタリをにげよう",
    difficulty: "easy",
    nextMoveColor: "black",
    description: "アタリになっている●をにがせるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 2, 1, 2, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    sequence: [
      {
        move: "4,3",
        color: "black",
        comment: "せいかい！",
        status: "correct",
        next: [],
      },
    ],
    boardSize: 5,
  },
];
