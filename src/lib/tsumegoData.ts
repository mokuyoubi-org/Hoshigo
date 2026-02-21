// TsumegoData.ts
// 詰碁のデータ定義とサンプルデータ

export type Color = "black" | "white";

export type GoNode = {
  move: string; // "p" とか "3,2", "1,1" etc.
  nexts: GoNode[];
  status?: "correct" | "wrong"; // 終端ノードでなければundefined
  // color: Color; // 'black' | 'white'
  comment: string; // 「せいかい！」とか、「こう打たれたらどうする？」とか
};
export type Tsumego = {
  title: string; // タイトル。「簡単そうだけど。。。」とか
  board: number[][];
  nextMoveColor: Color; // 黒先の問題か白先の問題かが決まる
  nexts: GoNode[];
  description?: string; // 「黒先白死だよ！」とか。
  boardSize: number;
};

/*
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
*/

// ももぐみを目指す詰碁
export const MOMOGUMI_TSUMEGO: Tsumego[] = [
  {
    title: "石をとろう",
    nextMoveColor: "black",
    description: "○をとれるかな？",
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
        comment: "せいかい！\n上手に○をとれたね",
        status: "correct",
        nexts: [],
      },
    ],
    boardSize: 5,
  },
  {
    title: "はしっこの石をとろう",
    nextMoveColor: "black",
    description: "○をとれるかな？",
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
        comment: "せいかい！\n上手に○をとれたね",
        status: "correct",
        nexts: [],
      },
    ],
    boardSize: 5,
  },
  {
    title: "すみっこの石をとろう",
    nextMoveColor: "black",
    description: "○をとれるかな？",
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
        comment: "せいかい！\n上手に○をとれたね",
        status: "correct",
        nexts: [],
      },
    ],
    boardSize: 5,
  },
  {
    title: "相手の石をとろう",
    nextMoveColor: "black",
    description: "○をとれるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 2, 2],
      [0, 1, 2, 1, 2],
      [0, 1, 2, 0, 2],
    ],
    nexts: [
      {
        move: "5,4",
        comment: "せいかい！\n上手に○をとれたね",
        status: "correct",
        nexts: [],
      },
    ],
    boardSize: 5,
  },
  {
    title: "相手の石をとろう",
    nextMoveColor: "black",
    description: "○をとれるかな？",
    board: [
      [1, 1, 1, 1, 1],
      [1, 2, 2, 2, 1],
      [1, 2, 0, 2, 1],
      [1, 2, 2, 2, 1],
      [1, 1, 1, 1, 0],
    ],
    nexts: [
      {
        move: "3,3",
        comment: "せいかい！\nきもちいいね",
        status: "correct",
        nexts: [],
      },
    ],
    boardSize: 5,
  },
  {
    title: "アタリをにげよう",
    nextMoveColor: "black",
    description: "アタリになっている●をにがせるかな？",
    board: [
      [0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 2, 1, 2, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    nexts: [
      {
        move: "4,3",
        comment: "せいかい！上手ににがせたね",
        status: "correct",
        nexts: [],
      },
    ],
    boardSize: 5,
  },
  // {
  //   title: "○をとろう",
  //   nextMoveColor: "black",
  //   description: "タダでとれる○があるよ",
  //   board: [
  //     [0, 1, 2, 0, 0, 0, 0],
  //     [0, 1, 2, 0, 0, 0, 0],
  //     [0, 1, 2, 0, 0, 0, 0],
  //     [0, 1, 2, 0, 0, 0, 0],
  //     [0, 1, 2, 0, 0, 0, 0],
  //     [0, 1, 2, 0, 0, 0, 0],
  //     [0, 1, 1, 2, 0, 0, 0],
  //   ],
  //   nexts: [
  //     {
  //       move: "6,4",
  //       color: "black",
  //       comment: "いいね",
  //       status: undefined,
  //       nexts: [
  //         {
  //           move: "7,5",
  //           color: "white",
  //           comment: "にげるよ",
  //           status: undefined,
  //           nexts: [
  //             {
  //               move: "6,5",
  //               color: "white",
  //               comment: "いいね",
  //               status: undefined,
  //               nexts: [
  //                 {
  //                   move: "7,6",
  //                   color: "white",
  //                   comment: "にげるよ",
  //                   status: undefined,
  //                   nexts: [
  //                     {
  //                       move: "6,6",
  //                       color: "white",
  //                       comment: "いいね",
  //                       status: undefined,
  //                       nexts: [
  //                         {
  //                           move: "7,7",
  //                           color: "white",
  //                           comment: "にげるよ",
  //                           status: undefined,
  //                           nexts: [
  //                             {
  //                               move: "6,7",
  //                               color: "white",
  //                               comment: "せいかい！上手にとれたね",
  //                               status: "correct",
  //                               nexts: [],
  //                             },
  //                           ],
  //                         },
  //                       ],
  //                     },
  //                   ],
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  //   boardSize: 7,
  // },
];

// おれんじぐみを目指す詰碁
export const ORANGEGUMI_TSUMEGO: Tsumego[] = [
  {
    title: "○をとろう",
    nextMoveColor: "black",
    description: "タダでとれる○があるよ",
    board: [
      [0, 1, 2, 0, 0, 0],
      [0, 1, 2, 0, 0, 0],
      [0, 1, 2, 0, 0, 0],
      [0, 1, 2, 0, 0, 0],
      [0, 1, 2, 0, 0, 0],
      [0, 1, 1, 2, 0, 0],
    ],
    nexts: [
      {
        move: "5,4",
        comment: "",
        status: undefined,
        nexts: [
          {
            move: "6,5",
            comment: "",
            status: undefined,
            nexts: [
              {
                move: "5,5",
                comment: "",
                status: undefined,
                nexts: [
                  {
                    move: "6,6",
                    comment: "",
                    status: undefined,
                    nexts: [
                      {
                        move: "5,6",
                        comment: "せいかい！上手にとれたね",
                        status: "correct",
                        nexts: [],
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
    boardSize: 6,
  },
  {
    title: "○をとろう",
    nextMoveColor: "black",
    description: "にげる右下の○をとろう！",
    board: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 2, 2],
    ],
    nexts: [
      {
        move: "5,5",
        comment: "",
        status: undefined,
        nexts: [
          {
            move: "6,4",
            comment: "",
            status: undefined,
            nexts: [
              {
                move: "5,4",
                comment: "",
                status: undefined,
                nexts: [
                  {
                    move: "6,3",
                    comment: "",
                    status: undefined,
                    nexts: [
                      {
                        move: "5,3",
                        comment: "",
                        status: undefined,
                        nexts: [
                          {
                            move: "6,2",
                            comment: "",
                            status: undefined,
                            nexts: [
                              {
                                move: "5,2",
                                comment: "",
                                status: undefined,
                                nexts: [
                                  {
                                    move: "6,1",
                                    comment: "",
                                    status: undefined,
                                    nexts: [
                                      {
                                        move: "5,1",
                                        comment: "せいかい！上手にとれたね",
                                        status: "correct",
                                        nexts: [],
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
    boardSize: 6,
  },
];

export type TsumegoGroup = {
  id: string;
  title: string; // "ももぐみを目指す" など
  color: string; // グループのテーマカラー
  data: Tsumego[];
};

export const TSUMEGO_GROUPS: TsumegoGroup[] = [
  {
    id: "momo",
    title: `ももぐみを目指す${MOMOGUMI_TSUMEGO.length}問`,
    color: "#FFB7C5",
    data: MOMOGUMI_TSUMEGO,
  },
  {
    id: "orange",
    title: `おれんじぐみを目指す${ORANGEGUMI_TSUMEGO.length}問`,
    color: "#FFA07A",
    data: ORANGEGUMI_TSUMEGO,
  },
];
