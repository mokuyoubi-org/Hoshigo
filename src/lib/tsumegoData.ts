// TsumegoData.ts
// 詰碁のデータ定義とサンプルデータ

export type GoNode = {
  move: string; // "p" とか "3,2", "1,1" etc.
  nexts?: GoNode[];
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
// ルール確認レベル。石を取れるか。置けない場所置ける場所がわかっているか。コウがわかっているか。地を数えられるか。交互に打つ。マスの上に打つ。パス二回で終局。もしくは投了。
export const PINK: Tsumego[] = [
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
    title: "相手の石をとろう1",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 1, 0, 0],
      [0, 1, 2, 1, 0],
      [1, 2, 0, 2, 1],
      [0, 1, 2, 1, 0],
      [0, 0, 1, 0, 0],
    ],
    nexts: [
      {
        move: "3,3",
        isCorrect: true,
      },
    ],
  },
  {
    title: "相手の石をとろう2",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 1, 2, 0, 0],
      [1, 2, 0, 2, 0],
      [1, 2, 2, 1, 0],
      [0, 1, 1, 0, 0],
    ],
    nexts: [
      {
        move: "3,3",
        isCorrect: true,
      },
    ],
  },
  {
    title: "相手の石をとろう3",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
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
                isCorrect: true,
              },
            ],
          },
        ],
      },
      {
        move: "5,3",
        isCorrect: true,
      },
    ],
  },
  {
    title: "相手の石をとろう4",
    comment: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 1, 2, 1, 0],
      [1, 2, 0, 2, 1],
      [1, 2, 2, 2, 1],
    ],
    nexts: [
      {
        move: "4,3",
        isCorrect: true,
      },
    ],
  },
  {
    title: "相手の石をとろう5",
    comment: "○をとれるかな？",
    board: [
      [0, 1, 1, 0, 0],
      [1, 2, 2, 1, 0],
      [0, 1, 2, 2, 1],
      [0, 0, 1, 2, 0],
      [0, 0, 0, 1, 0],
    ],
    nexts: [
      {
        move: "4,5",
        isCorrect: true,
      },
    ],
  },
  {
    title: "●はここに打てる？1",
    comment: "●はここに打っていい？",
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
        comment: "ふせいかい！相手の石に上下左右を囲まれちゃう所には打てないよ",
        isCorrect: false,
      },
      {
        move: "打てない",
        comment:
          "せいかい！相手の石に上下左右を囲まれちゃう所には打てないんだったね",
        isCorrect: true,
      },
    ],
  },
  {
    title: "●はここに打てる？2",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    quizChoice: ["3,3", "打てない"],
    nexts: [
      {
        move: "3,3",
        comment: "せいかい！囲まれるのが自分の石なら打っても大丈夫なんだね",
        isCorrect: true,
      },
      {
        move: "打てない",
        comment: "ふせいかい！囲まれるのが自分の石なら打っても大丈夫なんだよ",
        isCorrect: false,
      },
    ],
  },

  {
    title: "●はここに打てる？3",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 2, 0],
      [0, 2, 0, 1, 2],
      [0, 0, 2, 2, 0],
      [0, 0, 0, 0, 0],
    ],
    quizChoice: ["3,3", "打てない"],
    nexts: [
      {
        move: "3,3",
        comment: "ふせいかい！相手の石に上下左右を囲まれちゃう所には打てないよ",
        isCorrect: false,
      },
      {
        move: "打てない",
        comment:
          "せいかい！相手の石に上下左右を囲まれちゃう所には打てないんだったね",
        isCorrect: true,
      },
    ],
  },

  {
    title: "●はここに打てる？4",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 1, 2, 2, 0],
      [1, 2, 0, 1, 2],
      [0, 1, 2, 2, 0],
      [0, 0, 0, 0, 0],
    ],
    quizChoice: ["3,3", "打てない"],
    nexts: [
      {
        move: "3,3",
        comment: "せいかい！相手の石を取れたね",
        isCorrect: true,
      },
      {
        move: "打てない",
        comment:
          "ふせいかい！相手の石を取れるなら囲まれるところにも打ってもいいんだよ",
        isCorrect: false,
      },
    ],
  },
  {
    title: "●はここに打てる？5",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 2, 2, 2],
      [0, 0, 2, 0, 2],
      [0, 0, 2, 2, 2],
    ],
    quizChoice: ["4,4", "打てない"],
    nexts: [
      {
        move: "4,4",
        comment: "ふせいかい！相手の石に上下左右を囲まれちゃう所には打てないよ",
        isCorrect: false,
      },
      {
        move: "打てない",
        comment:
          "せいかい！相手の石に上下左右を囲まれちゃう所には打てないんだったね",
        isCorrect: true,
      },
    ],
  },

  {
    title: "●はここに打てる？6",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [0, 1, 2, 2, 2],
      [0, 1, 2, 0, 2],
      [0, 1, 2, 2, 2],
    ],
    quizChoice: ["4,4", "打てない"],
    nexts: [
      {
        move: "4,4",
        comment: "せいかい！相手の石を取れたね",
        isCorrect: true,
      },
      {
        move: "打てない",
        comment:
          "ふせいかい！相手の石を取れるなら囲まれるところにも打ってもいいんだよ",
        isCorrect: false,
      },
    ],
  },

  {
    title: "●はここに打てる？7",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 1],
      [0, 2, 0, 2, 1],
    ],
    quizChoice: ["5,1", "5,3", "打てない"],
    nexts: [
      {
        move: "5,1",
        comment:
          "ふせいかい！そこに打っても○をとれるわけじゃないので、打てないよ",
        isCorrect: false,
      },
      {
        move: "5,3",
        comment:
          "ふせいかい！そこに打っても○をとれるわけじゃないので、打てないよ",
        isCorrect: false,
      },

      {
        move: "打てない",
        comment: "せいかい！これが「二眼の生き」だね",
        isCorrect: true,
      },
    ],
  },

  {
    title: "●はここに打てる？8",
    comment: "●はここに打っていい？",
    board: [
      [0, 0, 1, 2, 2],
      [0, 0, 1, 2, 0],
      [0, 0, 1, 2, 2],
      [0, 0, 1, 2, 1],
      [0, 0, 2, 0, 1],
    ],
    quizChoice: ["5,4", "打てない"],
    nexts: [
      {
        move: "5,4",
        comment:
          "ふせいかい！そこに打っても○をとれるわけじゃないので、打てないよ",
        isCorrect: false,
      },
      {
        move: "打てない",
        comment: "せいかい！",
        isCorrect: true,
      },
    ],
  },

  {
    title: "コウがわかるかな1",
    comment: "まず○が打つよ",
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
          {
            move: "4,3",
            isCorrect: false,
            comment: "ふせいかい！コウの時はすぐに取り返すことはできないんだ",
          },
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
    title: "コウがわかるかな2",
    comment: "まず○が打つよ",
    isNextBlack: false,
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 2, 0, 2, 0],
      [0, 0, 2, 0, 0],
    ],
    nexts: [
      {
        autoPlay: true,
        move: "3,3",
        comment: "●は次の手で○を取り返せる？",
        quizChoice: ["4,3", "打てない"],
        nexts: [
          {
            move: "4,3",
            isCorrect: true,
            comment:
              "せいかい！取られて取り返すわけじゃないから、打てるんだ。このあと○はすぐに取り返せないよ",
          },
          {
            move: "打てない",
            isCorrect: false,
            comment: "ふせいかい！ホウリコムだけなら取り返せるんだ",
          },
        ],
      },
    ],
  },
  {
    title: "コウがわかるかな3",
    comment: "まず○が打つよ",
    isNextBlack: false,
    board: [
      [0, 0, 1, 0, 0],
      [0, 1, 2, 1, 0],
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
          {
            move: "4,3",
            isCorrect: true,
            comment: "せいかい！これはコウではないね",
          },
          {
            move: "打てない",
            isCorrect: false,
            comment: "ふせいかい！これはコウではないよ",
          },
        ],
      },
    ],
  },

  {
    title: "コウがわかるかな4",
    comment: "まず○が打つよ",
    isNextBlack: false,
    board: [
      [0, 1, 2, 0, 2, 0],
      [2, 1, 2, 2, 0, 2],
      [2, 1, 1, 1, 2, 0],
      [2, 2, 2, 1, 1, 1],
      [0, 2, 1, 0, 1, 0],
      [0, 0, 2, 1, 0, 0],
    ],
    nexts: [
      {
        autoPlay: true,
        move: "5,4", // 白とる
        comment: "",
        nexts: [
          {
            autoPlay: true,
            move: "3,6", // 黒他打つ
            comment: "",
            nexts: [
              {
                autoPlay: true,
                move: "2,5", // 白応える
                comment: "●は次の手で○を取り返せる？",
                quizChoice: ["5,3", "打てない"],
                nexts: [
                  {
                    move: "5,3",
                    isCorrect: true,
                    comment:
                      "せいかい！すぐに取り返すわけじゃないから打てるんだね",
                  },
                  {
                    move: "打てない",
                    isCorrect: false,
                    comment:
                      "ふせいかい！すぐに取り返すわけじゃないから打てるんだよ",
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
    title: "コウがわかるかな5",
    comment: "まず○が打つよ",
    isNextBlack: false,
    board: [
      [0, 0, 0, 0, 2, 0],
      [0, 0, 2, 2, 1, 2],
      [2, 2, 2, 1, 0, 1],
      [2, 1, 2, 1, 1, 1],
      [1, 0, 1, 1, 0, 0],
      [0, 1, 0, 0, 0, 0],
    ],
    nexts: [
      {
        autoPlay: true,
        move: "3,5", // 白とる
        comment: "●の次の手は？",
        quizChoice: ["2,5", "5,2", "どちらも打てない"],
        nexts: [
          {
            move: "2,5",
            isCorrect: false,
            comment: "ふせいかい！コウだからすぐに取り返すことはできないよ",
          },
          {
            move: "5,2",
            isCorrect: true,
            comment:
              "せいかい！争う必要のない時は、お互いにコウを終わらせるんだよ",
          },
          {
            move: "どちらも打てない",
            isCorrect: false,
            comment: "ふせいかい！",
          },
        ],
      },
    ],
  },
];

// おれんじぐみを目指す詰碁
// 簡単な石の取り方。繋がるとか切断するとか。
export const ORANGE: Tsumego[] = [
  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 2, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,3",
        nexts: [
          {
            move: "3,3",
            isCorrect: false,
          },
        ],
      },
      {
        move: "3,3",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,2",
                nexts: [
                  {
                    move: "5,4",
                    nexts: [
                      {
                        move: "5,5",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },
              {
                move: "5,4",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,1",
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

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
      [2, 2, 1, 0, 0],
      [1, 1, 2, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      { move: "5,3", nexts: [{ move: "4,4", isCorrect: false }] },
      {
        move: "4,4",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,4",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,1",
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
                    move: "5,1",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "3,3",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,2",
                nexts: [
                  {
                    move: "5,4",
                    nexts: [
                      {
                        move: "5,5",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },
              {
                move: "5,4",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,1",
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

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 2, 2, 2, 0],
      [0, 2, 1, 1, 0],
      [0, 1, 2, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,3",
        nexts: [
          {
            move: "4,4",
            nexts: [
              {
                move: "3,5",
                nexts: [
                  {
                    move: "2,5",
                    nexts: [
                      {
                        move: "4,5",
                        nexts: [
                          {
                            move: "5,5",
                            isCorrect: false,
                          },
                        ],
                      },

                      {
                        move: "5,4",
                        nexts: [
                          {
                            move: "4,5",
                            isCorrect: false,
                          },
                        ],
                      },

                      {
                        move: "4,5",
                        nexts: [
                          {
                            move: "3,5",
                            isCorrect: false,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },

              {
                move: "5,4",
                nexts: [
                  {
                    move: "3,5",
                    isCorrect: false,
                  },
                ],
              },

              {
                move: "4,5",
                nexts: [
                  {
                    move: "3,5",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },

      {
        move: "4,4",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,2",
                nexts: [
                  {
                    move: "5,4",
                    nexts: [
                      {
                        move: "5,5",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },
              {
                move: "5,4",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,1",
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

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 2, 2, 1, 0],
      [2, 1, 1, 2, 1],
      [2, 0, 0, 2, 1],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,4",
        nexts: [
          {
            move: "4,3",
            nexts: [
              {
                move: "4,2",
                nexts: [
                  {
                    move: "5,2",
                    isCorrect: false,
                  },
                ],
              },
              {
                move: "5,3",
                nexts: [
                  {
                    move: "4,2",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "4,3",
        nexts: [
          {
            move: "5,4",
            nexts: [
              {
                move: "5,3",
                nexts: [
                  {
                    move: "1,4",
                    nexts: [
                      {
                        move: "5,5",
                        isCorrect: true,
                      },
                    ],
                  },
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,5",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },

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
                        nexts: [
                          {
                            move: "1,3",
                            comment: "上手にとれたね！でも、○が生きちゃうよ",
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
    ],
  },

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [2, 2, 0, 1, 1],
      [2, 1, 2, 2, 1],
      [2, 1, 1, 2, 1],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,4",
        nexts: [
          {
            move: "2,3",
            isCorrect: false,
          },
        ],
      },
      {
        move: "2,3",
        nexts: [
          {
            move: "5,4",
            nexts: [
              {
                move: "5,5",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,3",
                        isCorrect: true,
                      },
                    ],
                  },
                  {
                    move: "5,3",
                    nexts: [
                      {
                        move: "5,2",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },

              {
                move: "5,3",
                nexts: [
                  {
                    move: "5,2",
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
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 2, 0, 0, 0],
      [0, 2, 1, 1, 0],
      [2, 2, 1, 2, 2],
      [1, 1, 2, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,3",
        nexts: [
          {
            move: "4,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "4,4",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,2",
                nexts: [
                  {
                    move: "5,1",
                    isCorrect: false,
                  },
                ],
              },
              {
                move: "5,4",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,1",
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

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 1, 0, 0, 0],
      [1, 2, 1, 0, 0],
      [1, 2, 2, 1, 2],
      [0, 1, 2, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,3",
        nexts: [
          {
            move: "4,4",
            nexts: [
              {
                move: "2,4",
                nexts: [
                  {
                    move: "2,5",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "4,4",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,2",
                nexts: [
                  {
                    move: "5,4",
                    nexts: [
                      {
                        move: "5,5",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },

              {
                move: "5,4",
                nexts: [
                  {
                    move: "5,2",
                    nexts: [
                      {
                        move: "5,1",
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

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 2, 1, 1, 0],
      [0, 1, 2, 2, 1],
      [2, 0, 1, 2, 0],
      [0, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,5",
        nexts: [
          {
            move: "5,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "1,2",
        nexts: [
          {
            move: "4,2",
            nexts: [
              {
                move: "2,1",
                nexts: [
                  {
                    move: "4,5",
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
        nexts: [
          {
            move: "4,2",
            nexts: [
              {
                move: "1,2",
                nexts: [
                  {
                    move: "4,5",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "5,4",
        nexts: [
          {
            move: "4,5",
            nexts: [
              {
                move: "5,5",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 2, 0],
      [0, 2, 0, 0, 0],
      [0, 1, 0, 2, 1],
      [0, 0, 1, 1, 0],
    ],
    nexts: [
      {
        move: "4,3",
        nexts: [
          {
            move: "3,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "3,3",
        nexts: [
          {
            move: "3,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "3,4",
        nexts: [
          {
            move: "4,3",
            nexts: [
              {
                move: "3,3",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 2, 0, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 2, 1, 1, 0],
      [0, 0, 2, 2, 1],
      [0, 0, 0, 1, 0],
    ],
    nexts: [
      {
        move: "5,3",
        nexts: [
          {
            move: "4,2",
            isCorrect: false,
          },
        ],
      },

      {
        move: "4,2",
        nexts: [
          {
            move: "5,3",
            nexts: [
              {
                move: "5,2",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },

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
                isCorrect: true,
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
      [0, 0, 2, 1, 0],
      [0, 2, 1, 1, 0],
      [2, 1, 2, 0, 0],
      [0, 0, 2, 0, 0],
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
                move: "1,3",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    title: "●をつなげよう",
    comment: "○を切りつつ、●をつなげられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 2, 0, 2, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "3,3",
        isCorrect: true,
      },
    ],
  },

  {
    title: "●をつなげよう",
    comment: "●をつなげられるかな？",
    board: [
      [0, 1, 0, 2, 0],
      [1, 1, 0, 2, 2],
      [0, 0, 0, 0, 0],
      [2, 2, 0, 1, 1],
      [0, 2, 0, 1, 0],
    ],
    nexts: [
      {
        move: "3,3",
        nexts: [
          {
            move: "2,3",
            nexts: [
              {
                move: "3,2",
                nexts: [
                  {
                    move: "3,4",
                    nexts: [
                      {
                        move: "4,3",
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

  {
    title: "○を切ろう",
    comment: "○を切れるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 2, 0, 1, 0],
      [0, 0, 2, 0, 0],
      [0, 1, 1, 2, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "3,4",
        isCorrect: true,
      },
    ],
  },

  {
    title: "○を切ろう",
    comment: "○を切れるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0],
      [1, 1, 2, 0, 0],
      [0, 2, 0, 1, 0],
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
    title: "○を切ろう",
    comment: "○を切れるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [2, 0, 2, 0, 0],
      [0, 2, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "3,2",
        isCorrect: true,
      },
    ],
  },

  {
    title: "○を切ろう",
    comment: "○を切れるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0],
      [0, 2, 2, 0, 0],
      [1, 1, 1, 2, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "3,4",
        isCorrect: true,
      },
    ],
  },

  {
    title: "○を切ろう",
    comment: "○を切れるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 2, 2, 1, 0],
      [0, 1, 0, 2, 2],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,3",
        isCorrect: true,
      },
    ],
  },
];

// きいろぐみを目指す詰碁
// 超簡単な死活。3目ナカ手とか。生きているか死んでいるかの判定。
export const YELLOW: Tsumego[] = [
  {
    title: "生きてる？",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 2, 2, 0, 0, 0],
      [2, 1, 1, 2, 2, 0],
      [2, 1, 0, 1, 1, 2],
      [2, 1, 1, 0, 1, 2],
      [0, 2, 2, 1, 1, 2],
      [0, 0, 0, 2, 2, 0],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: true,
        comment: "せいかい！",
      },
      {
        move: "いいえ",
        isCorrect: false,
        comment: "ふせいかい！",
      },
    ],
  },

  {
    title: "生きてる？2",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [2, 2, 2, 0, 0],
      [1, 1, 1, 2, 0],
      [0, 0, 1, 2, 0],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: false,
        comment: "ふせいかい！",
      },
      {
        move: "いいえ",
        isCorrect: true,
        comment: "せいかい！",
      },
    ],
  },

  {
    title: "生きてる？",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [2, 2, 2, 2, 0],
      [1, 1, 1, 1, 2],
      [0, 2, 0, 1, 0],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: false,
        comment: "ふせいかい！",
      },
      {
        move: "いいえ",
        isCorrect: true,
        comment: "せいかい！",
      },
    ],
  },
  {
    title: "生きてる？",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 0, 0, 0, 0],
      [2, 2, 2, 2, 0],
      [2, 1, 1, 2, 0],
      [1, 0, 1, 2, 0],
      [0, 1, 2, 2, 0],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: false,
        comment: "ふせいかい！",
      },
      {
        move: "いいえ",
        isCorrect: true,
        comment: "せいかい！",
      },
    ],
  },

  {
    title: "生きてる？",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 0, 0, 0, 0],
      [2, 2, 2, 0, 0],
      [0, 1, 2, 2, 0],
      [1, 0, 1, 2, 0],
      [0, 1, 2, 2, 0],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: false,
        comment: "ふせいかい！",
      },
      {
        move: "いいえ",
        isCorrect: true,
        comment: "せいかい！",
      },
    ],
  },
  {
    title: "生きてる？",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 0, 0, 0, 0, 0, 0],
      [2, 2, 2, 2, 2, 2, 0],
      [1, 1, 1, 1, 1, 2, 0],
      [1, 0, 1, 0, 2, 1, 1],
      [1, 1, 1, 1, 1, 2, 0],
      [2, 2, 2, 2, 2, 2, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: false,
        comment: "ふせいかい！",
      },
      {
        move: "いいえ",
        isCorrect: true,
        comment: "せいかい！",
      },
    ],
  },
  {
    title: "生きてる？",
    comment: "この●は生きてる？",
    quizChoice: ["はい", "いいえ"],
    board: [
      [0, 1, 1, 1, 1, 1],
      [1, 2, 2, 2, 2, 1],
      [1, 2, 0, 2, 2, 1],
      [1, 2, 2, 0, 2, 1],
      [1, 2, 2, 2, 2, 1],
      [0, 1, 1, 1, 1, 1],
    ],
    nexts: [
      {
        move: "はい",
        isCorrect: true,
        comment: "せいかい！",
      },
      {
        move: "いいえ",
        isCorrect: false,
        comment: "ふせいかい！",
      },
    ],
  },
  {
    title: "○をつかまえよう",
    comment: "右下の○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1],
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
    title: "生きてください",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [2, 2, 2, 2, 0],
      [1, 1, 1, 1, 2],
      [0, 1, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,4",
        isCorrect: true,
      },
    ],
  },

  {
    title: "生きてください",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [2, 2, 2, 2, 0],
      [1, 1, 1, 1, 2],
      [0, 0, 0, 1, 0],
    ],
    nexts: [
      {
        move: "5,2",
        isCorrect: true,
      },
    ],
  },

  {
    title: "生きてください",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [2, 2, 2, 0, 0],
      [1, 1, 2, 0, 0],
      [0, 1, 1, 2, 0],
      [0, 0, 1, 2, 0],
    ],
    nexts: [
      {
        move: "5,1",
        isCorrect: true,
      },
    ],
  },

  {
    title: "生きてください",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [2, 2, 2, 0, 0],
      [2, 1, 1, 2, 0],
      [1, 0, 0, 2, 0],
      [0, 1, 1, 2, 0],
    ],
    nexts: [
      {
        move: "4,3",
        isCorrect: true,
      },
    ],
  },

  {
    title: "生きてください",
    comment: "●は生きられるかな？",
    board: [
      [2, 2, 2, 2, 0],
      [0, 0, 0, 2, 0],
      [1, 0, 1, 2, 0],
      [1, 1, 1, 2, 0],
      [1, 0, 1, 2, 0],
    ],
    nexts: [
      {
        move: "2,2",
        nexts: [
          {
            move: "2,1",
            nexts: [
              {
                move: "2,3",
                isCorrect: true,
              },
            ],
          },
          {
            move: "2,3",
            nexts: [
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

// みどりぐみを目指す詰碁
// シチョウとか。 タケフとか。ゲタ。オイオトシ。囲碁用語。簡単な攻め合い。
export const GREEN: Tsumego[] = [
  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 1, 2, 2, 2, 0],
      [0, 1, 0, 1, 2, 0],
      [0, 0, 0, 1, 2, 2],
      [0, 1, 0, 2, 1, 0],
      [0, 1, 0, 0, 0, 2],
      [0, 0, 2, 0, 2, 0],
    ],
    nexts: [
      {
        move: "4,3",
        nexts: [
          {
            move: "5,3",
            isCorrect: false,
          },
        ],
      },
      {
        move: "5,4",
        nexts: [
          {
            move: "4,3",
            nexts: [
              {
                move: "5,3",
                nexts: [
                  {
                    move: "3,3",
                    nexts: [
                      {
                        move: "2,3",
                        nexts: [
                          {
                            move: "3,2",
                            nexts: [
                              {
                                move: "3,1",
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
    ],
  },
  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 2, 2, 1, 1, 0],
      [0, 2, 1, 2, 2, 1],
      [0, 2, 1, 0, 0, 0],
      [0, 2, 1, 0, 2, 0],
    ],
    nexts: [
      {
        move: "5,4",
        nexts: [
          {
            move: "5,5",
            isCorrect: false,
          },
        ],
      },
      {
        move: "5,5",
        nexts: [
          {
            move: "5,4",
            nexts: [
              {
                move: "6,4",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 1, 1, 0],
      [0, 1, 1, 2, 2, 1],
      [0, 0, 0, 2, 1, 1],
      [0, 0, 0, 0, 0, 0],
      [0, 2, 0, 2, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "3,3",
        nexts: [
          {
            move: "4,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "4,3",
        nexts: [
          {
            move: "4,4",
            isCorrect: false,
          },
        ],
      },
      {
        move: "4,4",
        nexts: [
          {
            move: "3,3",
            nexts: [
              {
                move: "3,2",
                nexts: [
                  {
                    move: "4,3",
                    isCorrect: false,
                  },
                ],
              },
              {
                move: "4,3",
                nexts: [
                  {
                    move: "3,2",
                    nexts: [
                      {
                        move: "3,1",
                        nexts: [
                          {
                            move: "4,2",
                            isCorrect: false,
                          },
                        ],
                      },

                      {
                        move: "4,2",
                        nexts: [
                          {
                            move: "3,1",
                            nexts: [
                              {
                                move: "4,1",
                                nexts: [
                                  {
                                    move: "2,1",
                                    nexts: [
                                      {
                                        move: "1,1",
                                        isCorrect: true,
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                move: "2,1",
                                nexts: [
                                  {
                                    move: "4,1",
                                    nexts: [
                                      {
                                        move: "5,1",
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
            ],
          },
        ],
      },
    ],
  },

  {
    title: "シチョウがわかるかな",
    comment: "○をシチョウでつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "3,4",
        nexts: [
          {
            move: "4,3",
            isCorrect: false,
          },
        ],
      },
      {
        move: "4,3",
        nexts: [
          {
            move: "3,4",
            nexts: [
              {
                move: "4,4",
                nexts: [
                  {
                    move: "3,5",
                    isCorrect: false,
                  },
                ],
              },
              {
                move: "3,5",
                nexts: [
                  {
                    move: "4,4",
                    nexts: [
                      {
                        move: "4,5",
                        nexts: [
                          {
                            move: "5,4",
                            isCorrect: false,
                          },
                        ],
                      },
                      {
                        move: "5,4",
                        nexts: [
                          {
                            move: "4,5",
                            nexts: [
                              {
                                move: "5,5",
                                nexts: [
                                  {
                                    move: "4,6",
                                    nexts: [
                                      {
                                        move: "5,6",
                                        nexts: [
                                          {
                                            move: "3,6",
                                            nexts: [
                                              {
                                                move: "2,6",
                                                isCorrect: true,
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                      {
                                        move: "3,6",
                                        nexts: [
                                          {
                                            move: "5,6",
                                            nexts: [
                                              {
                                                move: "6,6",
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
                              {
                                move: "4,6",
                                nexts: [
                                  {
                                    move: "5,5",
                                    nexts: [
                                      {
                                        move: "6,5",
                                        nexts: [
                                          {
                                            move: "5,6",
                                            nexts: [
                                              {
                                                move: "6,6",
                                                isCorrect: true,
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                      {
                                        move: "5,6",
                                        nexts: [
                                          {
                                            move: "6,5",
                                            nexts: [
                                              {
                                                move: "6,4",
                                                nexts: [
                                                  {
                                                    move: "5,3",
                                                    nexts: [
                                                      {
                                                        move: "6,6",
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
    ],
  },

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 1, 0],
      [0, 0, 2, 2, 0, 0],
      [0, 0, 2, 1, 1, 1],
      [0, 0, 2, 1, 2, 1],
      [0, 0, 0, 2, 2, 1],
      [0, 0, 0, 0, 2, 1],
    ],
    nexts: [
      {
        move: "5,3",
        nexts: [
          {
            move: "5,2",
            nexts: [
              {
                move: "6,4",
                isCorrect: true,
              },

              {
                move: "6,3",
                nexts: [
                  {
                    move: "2,5",
                    nexts: [
                      {
                        move: "6,4",
                        nexts: [
                          {
                            move: "5,5",
                            comment:
                              "○はとれたけど、もっとたんじゅんでいいかも",
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
    ],
  },
  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 2, 1, 0, 0, 0],
      [0, 2, 0, 2, 2, 0],
      [0, 1, 2, 1, 0, 0],
      [0, 1, 2, 1, 0, 0],
      [0, 1, 2, 0, 2, 0],
    ],
    nexts: [
      {
        move: "6,4",
        nexts: [
          {
            move: "3,3",
            isCorrect: false,
          },
        ],
      },
      {
        move: "3,3",
        nexts: [
          {
            move: "6,4",
            nexts: [
              {
                move: "5,5",
                nexts: [
                  {
                    move: "5,6",
                    nexts: [
                      {
                        move: "6,6",
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

  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 1, 0, 2, 0],
      [1, 1, 0, 2, 0],
      [2, 1, 0, 2, 0],
      [2, 0, 1, 2, 0],
      [2, 0, 2, 2, 0],
    ],
    nexts: [
      {
        move: "4,2",
        nexts: [
          {
            move: "5,2",
            isCorrect: false,
          },
        ],
      },
      {
        move: "5,2",
        nexts: [
          {
            move: "4,2",
            nexts: [
              {
                move: "5,2",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    title: "○のキズを見つけよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 0],
      [1, 0, 1, 1, 2, 0],
      [0, 2, 1, 2, 0, 0],
      [1, 1, 2, 0, 0, 0],
      [0, 2, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,5",
        nexts: [
          {
            move: "5,4",
            nexts: [
              {
                move: "5,5",
                nexts: [
                  {
                    move: "6,5",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "5,5",
        nexts: [
          {
            move: "5,4",
            nexts: [
              {
                move: "4,5",
                nexts: [
                  {
                    move: "6,5",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "5,4",
        nexts: [
          {
            move: "4,5",
            nexts: [
              {
                move: "6,4",
                nexts: [
                  {
                    move: "5,5",
                    nexts: [
                      {
                        move: "6,1",
                        isCorrect: true,
                      },
                    ],
                  },
                ],
              },

              {
                move: "5,5",
                nexts: [
                  {
                    move: "5,6",
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
    title: "両アタリができるかな",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 2, 0, 2, 1],
      [2, 0, 2, 0, 2],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "2,1",
        nexts: [
          {
            move: "2,5",
            isCorrect: false,
          },
        ],
      },
      {
        move: "2,5",
        nexts: [
          {
            move: "2,1",
            isCorrect: false,
          },
        ],
      },
      {
        move: "3,3",
        nexts: [
          {
            move: "2,1",
            nexts: [
              {
                move: "4,4",
                isCorrect: true,
              },
            ],
          },
          {
            move: "2,5",
            nexts: [
              {
                move: "4,2",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 1, 1, 0],
      [0, 1, 2, 2, 1],
      [1, 2, 0, 0, 2],
      [1, 2, 0, 2, 0],
      [0, 1, 2, 0, 0],
    ],
    nexts: [
      {
        move: "3,3",
        nexts: [
          {
            move: "5,1",
            nexts: [
              {
                move: "3,4",
                isCorrect: true,
              },
            ],
          },
          {
            move: "1,5",
            nexts: [
              {
                move: "4,3",
                isCorrect: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "○をつかまえよう",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 2, 2, 0, 0],
      [0, 1, 0, 0, 2, 0],
      [1, 2, 0, 0, 2, 0],
      [0, 1, 2, 2, 1, 0],
      [0, 0, 1, 1, 0, 0],
    ],
    nexts: [
      {
        move: "4,3",
        nexts: [
          {
            move: "4,4",
            isCorrect: false,
            comment: "上手にとれたね！でも、実はさらに○をとれる手があるんだ",
          },
        ],
      },
      {
        move: "4,4",
        nexts: [
          {
            move: "3,4",
            nexts: [
              {
                move: "4,3",
                isCorrect: true,
              },
              {
                move: "3,3",
                nexts: [
                  {
                    move: "4,3",
                    nexts: [
                      {
                        move: "4,4",
                        comment: "決まったね！",
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

  {
    title: "攻め合い1",
    comment: "●が先だよ。攻め合いはどちらの勝ち？",
    board: [
      [0, 0, 2, 0, 0, 0, 0],
      [2, 2, 2, 1, 1, 1, 1],
      [0, 0, 2, 1, 0, 0, 1],
      [1, 1, 1, 2, 2, 2, 1],
      [0, 0, 2, 1, 0, 0, 1],
      [2, 2, 2, 1, 1, 1, 1],
      [0, 0, 2, 0, 0, 0, 0],
    ],
    quizChoice: ["●", "○"],
    nexts: [
      {
        move: "●",
        isCorrect: true,
      },
      {
        move: "○",
        isCorrect: false,
      },
    ],
  },

  {
    title: "攻め合い2",
    comment: "●が先だよ。攻め合いはどちらの勝ち？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 2, 2, 1, 1, 0],
      [2, 0, 1, 2, 0, 1],
      [2, 0, 1, 2, 0, 1],
      [2, 0, 1, 2, 0, 1],
      [0, 2, 2, 1, 1, 0],
    ],
    quizChoice: ["●", "○"],
    nexts: [
      {
        move: "●",
        isCorrect: true,
      },
      {
        move: "○",
        isCorrect: false,
      },
    ],
  },
];

// あおぐみを目指す詰碁
// 簡単な死活。
export const BLUE: Tsumego[] = [
  {
    title: "生きられるかな",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 2, 2, 2, 0],
      [0, 0, 2, 1, 1, 0],
      [0, 0, 2, 1, 0, 1],
      [0, 0, 2, 2, 1, 0],
      [0, 0, 0, 1, 2, 0],
    ],
    nexts: [
      {
        move: "6,6",

        isCorrect: true,
      },
    ],
  },

  {
    title: "生きられるかな",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 2, 0],
      [0, 0, 0, 2, 1, 0],
      [0, 2, 2, 2, 1, 0],
      [0, 2, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "6,6",

        nexts: [
          {
            move: "3,6",
            nexts: [
              {
                move: "4,6",
                nexts: [
                  {
                    move: "6,3",
                    nexts: [
                      {
                        move: "6,4",
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
      {
        move: "3,6",
        nexts: [
          {
            move: "5,6",
            nexts: [
              {
                move: "6,3",
                nexts: [
                  {
                    move: "6,5",
                    nexts: [
                      {
                        move: "4,6",
                        nexts: [
                          {
                            move: "6,6",
                            nexts: [
                              {
                                move: "6,4",
                                nexts: [
                                  {
                                    move: "6,6",
                                    isCorrect: false,
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },

                      {
                        move: "6,4",
                        nexts: [
                          {
                            move: "6,6",
                            nexts: [
                              {
                                move: "4,6",
                                nexts: [
                                  {
                                    move: "6,6",
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
            ],
          },
        ],
      },

      {
        move: "6,3",
        nexts: [
          {
            move: "6,5",
            nexts: [
              {
                move: "3,6",
                nexts: [
                  {
                    move: "5,6",
                    nexts: [
                      {
                        move: "4,6",
                        nexts: [
                          {
                            move: "6,6",
                            nexts: [
                              {
                                move: "6,4",
                                nexts: [
                                  {
                                    move: "6,6",
                                    isCorrect: false,
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },

                      {
                        move: "6,4",
                        nexts: [
                          {
                            move: "6,6",
                            nexts: [
                              {
                                move: "4,6",
                                nexts: [
                                  {
                                    move: "6,6",
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
            ],
          },
        ],
      },
    ],
  },
  {
    title: "生きられるかな",
    comment: "●は生きられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 2, 0],
      [0, 0, 0, 2, 1, 0],
      [0, 0, 2, 2, 1, 0],
      [0, 0, 2, 1, 1, 0],
      [0, 0, 2, 1, 0, 0],
    ],
    nexts: [
      {
        move: "6,6",

        nexts: [
          {
            move: "3,6",
            nexts: [
              {
                move: "4,6",
                isCorrect: true,
              },
            ],
          },
        ],
      },
      {
        move: "3,6",
        nexts: [
          {
            move: "5,6",
            nexts: [
              {
                move: "6,6",
                nexts: [
                  {
                    move: "6,5",
                    isCorrect: false,
                    comment: "おしい！コウになるよ。もっといい手があるよ",
                  },
                ],
              },
              {
                move: "4,6",
                nexts: [
                  {
                    move: "6,6",
                    isCorrect: false,
                    comment: "おしい！●は二眼ができないよ",
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
    title: "○をしとめられるかな",
    comment: "○をしとめられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1],
      [0, 1, 2, 2, 2, 2],
      [0, 1, 2, 0, 0, 0],
      [0, 1, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,5",

        nexts: [
          {
            move: "6,5",
            nexts: [
              {
                move: "5,6",
                nexts: [
                  {
                    move: "5,4",
                    nexts: [
                      {
                        move: "6,4",
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
      {
        move: "6,5",
        nexts: [
          {
            move: "5,5",
            nexts: [
              {
                move: "6,4",
                nexts: [
                  {
                    move: "6,6",
                    nexts: [
                      {
                        move: "5,6",
                        isCorrect: false,
                        comment: "おしい！コウになるよ。もっといい答えがあるよ",
                      },
                    ],
                  },
                ],
              },
              {
                move: "6,6",
                nexts: [
                  {
                    move: "6,4",
                    isCorrect: false,
                    comment: "おしい！○は生きたよ",
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
    title: "○をしとめられるかな",
    comment: "○をしとめられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 1, 2, 2, 1, 0],
      [0, 1, 2, 0, 2, 0],
      [1, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "5,6",

        nexts: [
          {
            move: "4,6",
            nexts: [
              {
                move: "5,5",
                nexts: [
                  {
                    move: "5,4",
                    nexts: [
                      {
                        move: "3,6",
                        nexts: [
                          {
                            move: "4,4",
                            nexts: [
                              {
                                move: "6,2",
                                nexts: [
                                  {
                                    move: "6,5",
                                    nexts: [
                                      {
                                        move: "6,3",
                                        isCorrect: true,
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                move: "6,5",
                                nexts: [
                                  {
                                    move: "6,4",
                                    nexts: [
                                      {
                                        move: "6,2",
                                        nexts: [
                                          {
                                            move: "6,6",
                                            nexts: [
                                              {
                                                move: "5,5",
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
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "6,5",
        nexts: [
          {
            move: "5,5",
            nexts: [
              {
                move: "6,4",
                nexts: [
                  {
                    move: "6,6",
                    nexts: [
                      {
                        move: "5,6",
                        isCorrect: false,
                        comment: "おしい！コウになるよ。もっといい答えがあるよ",
                      },
                    ],
                  },
                ],
              },
              {
                move: "6,6",
                nexts: [
                  {
                    move: "6,4",
                    isCorrect: false,
                    comment: "おしい！○は生きたよ",
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
    title: "○をつかまえられるかな",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 0],
      [0, 0, 1, 1, 1, 2, 0],
      [0, 0, 1, 2, 2, 2, 0],
      [0, 1, 2, 0, 0, 0, 0],
      [0, 1, 0, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "6,4",

        nexts: [
          {
            move: "6,5",
            nexts: [
              {
                move: "7,6",
                nexts: [
                  {
                    move: "6,6",
                    nexts: [
                      {
                        move: "7,3",
                        nexts: [
                          {
                            move: "4,7",
                            nexts: [
                              {
                                move: "6,7",
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
        move: "7,6",

        nexts: [
          {
            move: "6,6",
            nexts: [
              {
                move: "6,4",
                nexts: [
                  {
                    move: "7,5",
                    nexts: [
                      {
                        move: "4,7",
                        nexts: [
                          {
                            move: "7,7",
                            isCorrect: false,
                          },
                        ],
                      },
                      {
                        move: "7,3",
                        nexts: [
                          {
                            move: "7,7",
                            isCorrect: false,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },

              {
                move: "7,5",
                nexts: [
                  {
                    move: "6,5",
                    nexts: [
                      {
                        move: "4,7",
                        nexts: [
                          {
                            move: "7,7",
                            isCorrect: false,
                          },
                        ],
                      },
                      {
                        move: "7,3",
                        nexts: [
                          {
                            move: "7,7",
                            isCorrect: false,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },

              {
                move: "7,3",
                nexts: [
                  {
                    move: "7,5",
                    nexts: [
                      {
                        move: "6,4",
                        nexts: [
                          {
                            move: "7,7",
                            isCorrect: false,
                          },
                        ],
                      },
                      {
                        move: "7,7",
                        nexts: [
                          {
                            move: "6,4",
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
        move: "6,5",

        nexts: [
          {
            move: "6,6",
            nexts: [
              {
                move: "7,6",
                nexts: [
                  {
                    move: "7,5",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "6,6",

        nexts: [
          {
            move: "6,7",
            nexts: [
              {
                move: "7,6",
                nexts: [
                  {
                    move: "6,5",
                    isCorrect: false,
                  },
                ],
              },
              {
                move: "6,5",
                nexts: [
                  {
                    move: "6,4",
                    isCorrect: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        move: "6,7",

        nexts: [
          {
            move: "6,6",
            nexts: [
              {
                move: "6,4",
                nexts: [
                  {
                    move: "6,5",
                    nexts: [
                      {
                        move: "7,3",
                        nexts: [
                          {
                            move: "7,6",
                            nexts: [
                              {
                                move: "6,4",
                                comment:
                                  "めっちゃおしい！実は無条件でつかまえられるよ",
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
                move: "7,6",
                nexts: [
                  {
                    move: "7,5",
                    nexts: [
                      {
                        move: "6,4",
                        nexts: [
                          {
                            move: "7,7",
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
    ],
  },

  {
    title: "つかまえられるかな",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 0],
      [0, 1, 1, 1, 2, 1, 2, 0],
      [1, 0, 2, 2, 0, 2, 2, 0],
      [0, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 2, 1, 2, 0, 0, 0],
    ],
    nexts: [
      {
        move: "8,2",

        nexts: [
          {
            move: "7,5",

            nexts: [
              {
                move: "8,7",

                nexts: [
                  {
                    move: "7,7",

                    nexts: [
                      {
                        move: "8,6",

                        nexts: [
                          {
                            move: "5,8",

                            nexts: [
                              {
                                move: "7,8",

                                nexts: [
                                  {
                                    move: "7,6",

                                    nexts: [
                                      {
                                        move: "8,8",

                                        nexts: [
                                          {
                                            move: "6,8",

                                            nexts: [
                                              {
                                                move: "8,7",

                                                nexts: [
                                                  {
                                                    move: "8,8",

                                                    nexts: [
                                                      {
                                                        move: "7,8",

                                                        nexts: [
                                                          {
                                                            move: "8,6",

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
            ],
          },
        ],
      },

      {
        move: "8,7",

        nexts: [
          {
            move: "7,7",

            nexts: [
              {
                move: "7,5",

                nexts: [
                  {
                    move: "7,4",

                    nexts: [
                      {
                        move: "6,5",

                        nexts: [
                          {
                            move: "7,6",

                            nexts: [
                              {
                                move: "6,5",

                                nexts: [
                                  {
                                    move: "5,8",

                                    nexts: [
                                      {
                                        move: "7,8",

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
            ],
          },
        ],
      },
    ],
  },

  {
    title: "つかまえられるかな",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 1, 2, 0],
      [0, 0, 0, 1, 2, 0, 0],
      [0, 0, 0, 1, 2, 0, 2],
      [0, 0, 0, 1, 0, 0, 0],
    ],
    nexts: [
      {
        move: "7,6",

        nexts: [
          {
            move: "7,5",

            nexts: [
              {
                move: "4,7",

                nexts: [
                  {
                    move: "3,6",

                    nexts: [
                      {
                        move: "2,6",

                        nexts: [
                          {
                            move: "5,7",

                            nexts: [
                              {
                                move: "6,6",

                                nexts: [
                                  {
                                    move: "5,6",

                                    nexts: [
                                      {
                                        move: "3,7",

                                        nexts: [
                                          {
                                            move: "2,7",

                                            nexts: [
                                              {
                                                move: "3,7",

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
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      {
        move: "3,5",

        nexts: [
          {
            move: "6,7",

            nexts: [
              {
                move: "5,7",

                nexts: [
                  {
                    move: "7,6",

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
    title: "つかまえられるかな",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1],
      [0, 1, 0, 2, 2, 2],
      [0, 1, 2, 0, 0, 0],
      [0, 1, 1, 2, 2, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "6,4",

        nexts: [
          {
            move: "6,5",

            nexts: [
              {
                move: "5,6",

                nexts: [
                  {
                    move: "3,3",

                    nexts: [
                      {
                        move: "4,5",

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

  {
    title: "つかまえられるかな",
    comment: "○をつかまえられるかな？",
    board: [
      [0, 0, 1, 1, 1, 0],
      [0, 0, 1, 2, 2, 2],
      [0, 0, 1, 2, 0, 0],
      [0, 1, 1, 2, 0, 0],
      [1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "6,5",

        nexts: [
          {
            move: "5,3",

            nexts: [
              {
                move: "6,3",

                nexts: [
                  {
                    move: "5,4",

                    nexts: [
                      {
                        move: "6,4",

                        nexts: [
                          {
                            move: "5,2",

                            nexts: [
                              {
                                move: "6,2",

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
        move: "5,4",

        nexts: [
          {
            move: "5,5",

            nexts: [
              {
                move: "6,5",

                nexts: [
                  {
                    move: "5,3",

                    nexts: [
                      {
                        move: "6,3",

                        nexts: [
                          {
                            move: "6,4",

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
        move: "5,5",

        nexts: [
          {
            move: "5,4",

            nexts: [
              {
                move: "5,3",

                nexts: [
                  {
                    move: "6,5",

                    nexts: [
                      {
                        move: "4,5",

                        nexts: [
                          {
                            move: "4,6",

                            nexts: [
                              {
                                move: "5,6",

                                nexts: [
                                  {
                                    move: "3,6",
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
                    move: "5,6",

                    nexts: [
                      {
                        move: "4,6",

                        nexts: [
                          {
                            move: "6,5",

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
        move: "5,3",

        nexts: [
          {
            move: "6,5",

            nexts: [
              {
                move: "5,5",

                nexts: [
                  {
                    move: "5,4",

                    nexts: [
                      {
                        move: "4,5",

                        nexts: [
                          {
                            move: "4,6",

                            nexts: [
                              {
                                move: "5,6",

                                nexts: [
                                  {
                                    move: "3,6",

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
                    move: "5,5",

                    nexts: [
                      {
                        move: "5,6",

                        nexts: [
                          {
                            move: "3,6",

                            nexts: [
                              {
                                move: "4,6",

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
            ],
          },
        ],
      },
    ],
  },
];

// そらぐみ1を目指す詰碁
// ここら辺から基本的な詰碁が始まる。初級詰碁
export const SKY1: Tsumego[] = [

];

// そらぐみ2を目指す詰碁
// 中級詰碁
export const SKY2: Tsumego[] = [

];

// にじぐみ1を目指す詰碁
// 上級詰碁
export const RAINBOW1: Tsumego[] = [

];

// にじぐみ2を目指す詰碁
// 上級詰碁
export const RAINBOW2: Tsumego[] = [];

export type TsumegoGroup = {
  // id: number;
  title: string; // "ももぐみを目指す" など
  color: string; // グループのテーマカラー
  data: Tsumego[];
};

export const TSUMEGO_GROUPS: TsumegoGroup[] = [
  {
    title: `ももぐみを目指す${PINK.length}問`,
    color: "#FFB7C5",
    data: PINK,
  },
  {
    title: `おれんじぐみを目指す${ORANGE.length}問`,
    color: "#FFA07A",
    data: ORANGE,
  },
  {
    title: `きいろぐみを目指す${YELLOW.length}問`,
    color: "#ffed7a",
    data: YELLOW,
  },
  {
    title: `みどりぐみを目指す${GREEN.length}問`,
    color: "#7dbb99",
    data: GREEN,
  },
  {
    title: `あおぐみを目指す${BLUE.length}問`,
    color: "#7a97ff",
    data: BLUE,
  },
  // {
  //   title: `そらぐみ☆を目指す${SKY1.length}問`,
  //   color: "#7ad3ff",
  //   data: SKY1,
  // },
  // {
  //   title: `そらぐみ☆☆を目指す${SKY2.length}問`,
  //   color: "#7ad3ff",
  //   data: SKY2,
  // },
  // {
  //   title: `にじぐみ☆を目指す${RAINBOW1.length}問`,
  //   color: "#dc7aff",
  //   data: RAINBOW1,
  // },
  // {
  //   title: `にじぐみ☆☆を目指す${RAINBOW2.length}問`,
  //   color: "#dc7aff",
  //   data: RAINBOW2,
  // },
];
