// TsumegoData.ts
// 詰碁のデータ定義とサンプルデータ

export type GoNode = {
  move: string; // "p" とか "3,2", "1,1" etc.
  nexts?: GoNode[];
  isAnimationMove?: boolean; // 拡張用
  quizChoice?: string[]; // 拡張用
  isCorrect?: boolean; // 終端ノードでなければundefined
  comment?: string; // 「せいかい！」とか、「こう打たれたらどうする？」とか
  autoPlay?: boolean;
};
export type Tsumego = {
  title?: string; // タイトル。「簡単そうだけど。。。」とか
  board: number[][]; // 問題図。必須
  isNextBlack?: boolean; // 黒先の問題か白先の問題かが決まる。
  nexts?: GoNode[];
  comment?: string; // 「黒先白死だよ！」とか。
  quizChoice?: string[]; // 拡張用
};

// ももぐみを目指す詰碁
export const MOMOGUMI_TSUMEGO: Tsumego[] = [
  {
    title: "コウがわかるかな",
    isNextBlack: false,
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 2, 1, 2, 0],
      [0, 0, 2, 0, 0],
    ],
    nexts: [
      {
        autoPlay: true,
        move: "3,3",
        comment: "●は次の手で○を取り返せる？",
        quizChoice: ["4,3", "打てない"],
        nexts: [
          { move: "4,3", isCorrect: false, comment: "ふせいかい！" },
          {
            move: "打てない",
            isCorrect: true,
            comment:
              "せいかい！コウの時はすぐに取り返すことはできないんだったね",
          },
        ],
      },
    ],
  },
  {
    title: "ここに打てる？",
    comment: "ここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 2, 0, 2, 0],
      [0, 0, 2, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    quizChoice: ["3,3", "打てない"],
    nexts: [
      {
        move: "3,3",
        isCorrect: false,
      },
      {
        move: "打てない",
        comment: "せいかい！上下左右を囲まれちゃう所には打てないよ",
        isCorrect: true,
      },
    ],
  },
  {
    title: "石をとろう",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 2, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,3",
        isCorrect: true,
      },
    ],
  },
  {
    title: "はしっこの石をとろう",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 0, 0, 1, 2],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,5",
        isCorrect: true,
      },
    ],
  },
  {
    title: "すみっこの石をとろう",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 0, 0, 0, 2],
    ],
    nexts: [
      {
        move: "5,4",
        isCorrect: true,
      },
    ],
  },
  {
    title: "相手の石をとろう",
    comment: "○をとれるかな？",
    board: [
      [0, 1, 1, 1, 0],
      [1, 1, 2, 1, 1],
      [1, 2, 0, 2, 1],
      [1, 1, 2, 1, 1],
      [0, 1, 1, 1, 0],
    ],
    nexts: [
      {
        move: "3,3",
        isCorrect: true,
      },
    ],
  },
  {
    title: "相手の石をとろう",
    comment: "○をとれるかな？",
    board: [
      [2, 2, 2, 2, 2],
      [2, 1, 0, 1, 2],
      [2, 1, 0, 1, 2],
      [2, 1, 1, 1, 2],
      [2, 2, 2, 2, 2],
    ],
    nexts: [
      {
        move: "2,3",
        isCorrect: true,
      },
      {
        move: "3,3",
        nexts: [
          {
            move: "2,3",
            comment: "しっぱい！逆に取られちゃうよ",
            isCorrect: false,
          },
        ],
      },
    ],
  },
  {
    title: "相手の石をとろう",
    comment: "○をとれるかな？",
    board: [
      [0, 1, 2, 0, 0],
      [0, 1, 2, 0, 0],
      [1, 1, 2, 2, 0],
      [1, 2, 1, 2, 0],
      [1, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,4",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "4,3",
                nexts: [
                  {
                    move: "2,5",
                    isCorrect: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "5,3",
        nexts: [
          {
            move: "5,4",
            comment: "せいかい！\n実は他にも答えがあるよ",
            isCorrect: true,
          },
        ],
      },
    ],
  },
];

// おれんじぐみを目指す詰碁
export const ORANGEGUMI_TSUMEGO: Tsumego[] = [
  {
    title: "○をとろう",
    comment: "タダでとれる○があるよ",
    board: [
      [0, 1, 2, 0, 0],
      [0, 1, 2, 0, 2],
      [0, 1, 2, 0, 0],
      [0, 1, 2, 0, 0],
      [0, 1, 1, 2, 0],
    ],
    nexts: [
      {
        move: "4,4",
        nexts: [
          {
            move: "3,4",
            nexts: [
              {
                move: "5,5",
                nexts: [
                  {
                    move: "1,4",
                    isCorrect: true,
                  },
                ],
              },

              {
                move: "4,5",
                nexts: [
                  {
                    move: "3,5",
                    nexts: [
                      {
                        move: "5,5",
                        nexts: [
                          {
                            move: "5,4",
                            isCorrect: false,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "4,5",
        nexts: [
          {
            move: "4,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "3,4",
        nexts: [
          {
            move: "4,4",
            isCorrect: false,
          },
        ],
      },
    ],
  },
  {
    title: "○をしとめよう",
    comment: "右下の○をしとめられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0],
      [1, 2, 2, 2, 2],
      [0, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,4",
        isCorrect: true,
      },
    ],
  },
  {
    title: "○をとろう",
    comment: "タダでとれる○があるよ",
    board: [
      [0, 0, 2, 1, 0],
      [0, 0, 2, 1, 0],
      [0, 0, 2, 1, 0],
      [0, 0, 0, 2, 1],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,3",
        nexts: [
          {
            move: "4,2",
            nexts: [
              {
                move: "5,4",
                isCorrect: true,
              },
              {
                move: "5,3",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,4",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },
              {
                move: "5,2",
                nexts: [
                  {
                    move: "5,3",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "両アタリで○をとろう",
    comment: "両アタリで○をとろう",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 1, 1],
      [0, 2, 1, 1, 0],
      [2, 1, 2, 2, 1],
      [0, 0, 0, 2, 0],
    ],
    nexts: [
      {
        move: "5,2",
        nexts: [
          {
            move: "2,2",
            isCorrect: false,
          },
        ],
      },
      {
        move: "2,2",
        nexts: [
          {
            move: "5,2",

            nexts: [
              {
                move: "1,1",
                nexts: [
                  {
                    move: "2,1",
                    nexts: [
                      {
                        move: "3,1",
                        nexts: [
                          {
                            move: "4,2",
                            nexts: [
                              {
                                move: "1,3",
                                nexts: [
                                  {
                                    move: "2,1",
                                    nexts: [
                                      {
                                        move: "1,2",
                                        isCorrect: true,
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                move: "1,2",
                isCorrect: true,
              },
              {
                move: "1,3",
                isCorrect: true,
              },
              {
                move: "1,4",
                isCorrect: true,
              },
              {
                move: "1,5",
                nexts: [
                  {
                    move: "1,3",
                    nexts: [
                      {
                        move: "1,2",
                        nexts: [
                          {
                            move: "2,1",
                            isCorrect: false,
                          },
                        ],
                      },
                      {
                        move: "2,1",
                        nexts: [
                          {
                            move: "1,2",
                            isCorrect: false,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                move: "2,1",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },
];

export type TsumegoGroup = {
  id: number;
  title: string; // "ももぐみを目指す" など
  color: string; // グループのテーマカラー
  data: Tsumego[];
};

export const TSUMEGO_GROUPS: TsumegoGroup[] = [
  {
    id: 0,
    title: `ももぐみを目指す${MOMOGUMI_TSUMEGO.length}問`,
    color: "#FFB7C5",
    data: MOMOGUMI_TSUMEGO,
  },
  {
    id: 1,
    title: `おれんじぐみを目指す${ORANGEGUMI_TSUMEGO.length}問`,
    color: "#FFA07A",
    data: ORANGEGUMI_TSUMEGO,
  },
];
