import React, { createContext, useContext } from "react";

// ==================== 型定義 ====================

// オペレーション
// "showSentence": 文字を映す
// "showNextButton": 次へボタンを表示する
// "showQuizButton": 3択のクイズボタンを表示する
// "botSetBoard": ボットがゼロから盤面を用意する
// "botReplayMove": ボットが盤面から手を戻す
// "botApplyMove": ボットが盤面に手を加える
// "userPlay": ユーザの手を待つ(その後のボットの応手含む)

type Operation =
  | "showSentence"
  | "showNextButton"
  | "showBackButton"
  | "showQuizButton"
  | "botSetBoard"
  | "botReplayMove"
  | "botApplyMove"
  | "userPlay"
  | "autoGoNext"
  | "showTerritory";

// なお、スクリーンが新しくなったら文字アニメーションは自動で始まり、自動でコンプリートする。
// というのは、スクリーンが新しくなったら発火するuseEffect内に処理を書いているからだ。
// で、文字を映す、というのは毎回行うことだから、これでいい。


export type MyScreen = {
  operations: Operation[]; // 🌟 必須 // どのオペレーションか // デフォルトは0
  sentence: string; // 🌟 必須 // 説明文 // 不要なら空文字列""
  botSetBoard: string[]; // 🌟 必須 // ボットが盤面を最初から用意する場合の手順 // 不要なら空配列[]
  botApplyMove: string[]; // 🌟 必須 // ボットがすでに存在する盤面に手を加える場合の手順 // 不要なら空配列[]
  botReplayMove: number; // 🌟 必須 // ボットがすでに存在する盤面を巻き戻す場合の手数 // 不要なら0
  canPutStones: string[]; // 🌟 必須  // ユーザが手を打つ場合に打っていい場所の候補 // 不要なら空配列[]
  characterFaceIndex: number; // 🌟 必須 // キャラクタの表情 // デフォルトは0
  nextIndex: number; // 🌟 必須 // 次へボタンを押した場合、何個先のスクリーンに飛ぶか // デフォルトは1
  replayIndex: number; // 🌟 必須 // 戻るボタンを押した場合、何個前のスクリーンに飛ぶか // デフォルトは-1
  autoNext: boolean; // 🌟 必須 // 全ての処理が終わった後に自動で次のページへ飛ぶかどうか // デフォルトはfalse
  territoryBoard: number[][];
};

// ==================== チュートリアルデータ ====================
export const getTutorialScreens = (displayname: string): MyScreen[][] => {
  const defaultScreen: MyScreen = {
    operations: ["showSentence", "showNextButton", "showBackButton"],
    sentence: "",
    botSetBoard: [],
    botApplyMove: [],
    botReplayMove: 0,
    canPutStones: [],
    characterFaceIndex: 0,
    nextIndex: 1,
    replayIndex: -1,
    autoNext: false,
    territoryBoard: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => 0),
    ),
  };

  const allGrids = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => `${r + 1},${c + 1}`),
  ).flat();

  return [
    [
      {
        ...defaultScreen,
        sentence: "こんにちは！ぼくの名前はくまくんだよ",
        operations: ["showSentence", "showNextButton"],
      },
      { ...defaultScreen, sentence: `${displayname}のこと待ってたんだ` },

      { ...defaultScreen, sentence: "囲碁なんてさっぱりわからない？" },
      {
        ...defaultScreen,
        sentence: "大丈夫！僕と一緒に楽しく囲碁をマスターしよう！",
      },
      {
        ...defaultScreen,
        sentence: "早速どこでもいいから打ってみよう",
        canPutStones: allGrids,
        operations: ["showSentence", "userPlay", "autoGoNext"],
      },
      {
        ...defaultScreen,
        sentence: "完璧！",
        operations: ["showSentence", "showNextButton"],
      },
      {
        ...defaultScreen,
        sentence:
          "そのとおり、\n囲碁の石はマスの中じゃなくて、\n交点の上に打つんだよ",
      },
      {
        ...defaultScreen,
        sentence: "そして、 ● と ○ を、● から先に\n交互に打つんだよ",
      },
      {
        ...defaultScreen,
        sentence: "では、次は ○ を打ってみて！",
        canPutStones: allGrids,
        operations: ["showSentence", "userPlay", "autoGoNext"],
      },
      {
        ...defaultScreen,
        sentence: "完璧！",
        operations: ["showSentence", "showNextButton"],
      },

      {
        ...defaultScreen,
        sentence: "囲碁の目的は、より多くの陣地を獲得することだよ",
      },
      {
        ...defaultScreen,
        sentence: "例えば…",
        botSetBoard: [
          "6,6",
          "4,4",
          "4,6",
          "6,4",
          "3,5",
          "3,4",
          "2,5",
          "2,4",
          "1,4",
          "1,3",
          "1,5",
          "2,3",
          "7,5",
          "7,4",
          "8,5",
          "8,4",
          "9,4",
          "9,3",
          "9,5",
          "8,3",
          "5,5",
          "6,5",
          "7,6",
          "4,5",
          "3,6",
          "5,4",
          "5,6",
        ],
        operations: ["showSentence", "botSetBoard", "autoGoNext"],
      },

      {
        ...defaultScreen,
        sentence: "このような盤面があったら、",
      },
      {
        ...defaultScreen,
        sentence: "● に覆われてるのが 31目、",
        territoryBoard: [
          [0, 0, 0, 0, 0, 1, 1, 1, 1],
          [0, 0, 0, 0, 0, 1, 1, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 1, 1],
          [0, 0, 0, 0, 0, 1, 1, 1, 1],
          [0, 0, 0, 0, 0, 1, 1, 1, 1],
        ],
        operations: [
          "showSentence",
          "showTerritory",
          "showNextButton",
          "showBackButton",
        ],
      },
      {
        ...defaultScreen,
        sentence: "○ に覆われてるのが 23目 なので、",
        territoryBoard: [
          [2, 2, 0, 0, 0, 1, 1, 1, 1],
          [2, 2, 0, 0, 0, 1, 1, 1, 1],
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 0, 0, 0, 1, 1, 1, 1],
          [2, 2, 0, 0, 0, 1, 1, 1, 1],
        ],
        operations: [
          "showSentence",
          "showTerritory",
          "showNextButton",
          "showBackButton",
        ],
      },
      {
        ...defaultScreen,
        sentence: "●31目 - ○23目 = 8目で、● の8目勝ちとなるよ",

        operations: ["showSentence", "showNextButton", "showBackButton"],
      },

      {
        ...defaultScreen,
        sentence:
          "囲碁では先に打つ ● が有利なので、 ○ には6.5目のコミって呼ばれるハンデがあるんだよ。",
      },
      {
        ...defaultScreen,
        sentence: "○ の23目に6.5目のコミを考慮した場合、○29.5目になるんだよ",
      },
      { ...defaultScreen, sentence: "それでは、クイズだよ！" },
      {
        ...defaultScreen,
        sentence:
          "囲碁は\n① ●から、●と○が交互に打つ\n② ○から、○と●が交互に打つ\n③ 相手が気づかなければ何回連続で打っても良い",
        operations: ["showSentence", "showQuizButton"],
      },
      {
        ...defaultScreen,
        sentence: "正解！！囲碁は、●から、●と○が交互に打つんだったね",
        nextIndex: 3,
        operations: ["showSentence", "showNextButton"],
      },
      {
        ...defaultScreen,
        sentence: "惜しい！確かに交互だけど、●から打つんだよ！",
        replayIndex: -2,
        operations: ["showSentence", "showBackButton"],
      },
      {
        ...defaultScreen,
        sentence: "ダメだよ！笑",
        replayIndex: -3,
        operations: ["showSentence", "showBackButton"],
      },
      {
        ...defaultScreen,
        sentence: "次のクイズだよ！",
        operations: ["showSentence", "showNextButton"],
      },
      {
        ...defaultScreen,
        sentence:
          "囲碁はどんなゲーム？\n① 陣地取りゲーム\n② 石をたくさん取った方が勝ちのゲーム\n③ 石を五個繋げたら勝ちのゲーム",
        operations: ["showSentence", "showQuizButton"],
      },
      {
        ...defaultScreen,
        sentence: "正解！！囲碁は陣地取りゲームだったね",
        nextIndex: 3,
      },
      {
        ...defaultScreen,
        sentence:
          "惜しい！実は、たくさん石を取れた方が勝ちとも限らないんだ。でも石を取れるってよく知っていたね！",
        replayIndex: -2,
        operations: ["showSentence", "showBackButton"],
      },
      {
        ...defaultScreen,
        sentence: "惜しい！それは似ているけど五目並べだね",
        replayIndex: -3,
        operations: ["showSentence", "showBackButton"],
      },
      {
        ...defaultScreen,
        sentence: "それでは最後のクイズ！",

        botSetBoard: [
          "6,7",
          "4,3",
          "6,4",
          "3,5",
          "3,7",
          "7,3",
          "6,3",
          "7,4",
          "7,5",
          "8,5",
          "7,6",
          "8,6",
          "8,7",
          "5,2",
          "6,2",
          "7,2",
          "7,1",
          "8,1",
          "6,1",
          "8,2",
          "2,6",
          "2,5",
          "1,5",
          "1,4",
          "1,6",
          "2,3",
          "9,6",
          "8,4",
          "4,2",
          "3,2",
          "4,1",
          "3,1",
          "5,1",
          "5,3",
          "5,5",
          "3,6",
          "2,8",
          "4,6",
          "4,7",
          "5,6",
          "5,7",
          "6,6",
          "6,5",
          "4,4",
          "4,5",
          "9,5",
          "9,7",
          "5,4",
          "7,7",
          "3,4",
        ],
        operations: ["showSentence", "botSetBoard", "showNextButton"],
      },
      {
        ...defaultScreen,
        sentence:
          "このような盤面があったとき、コミ6.5目も計算に入れると、これはどっちの何目勝ち？\n① ●7目勝ち\n② ○3.5目勝ち\n③ ●0.5目勝ち",
        operations: ["showSentence", "showQuizButton"],
      },
      {
        ...defaultScreen,
        sentence: "惜しい！コミの6.5目を計算に入れてね",
        replayIndex: -1,
        operations: ["showSentence", "showBackButton"],
      },
      {
        ...defaultScreen,
        sentence: "惜しい！陣地をよく数えてみてね",
        replayIndex: -2,
        operations: ["showSentence", "showBackButton"],
      },
      {
        ...defaultScreen,
        territoryBoard: [
          [0, 0, 0, 0, 0, 0, 1, 1, 1],
          [0, 0, 0, 0, 0, 0, 1, 0, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
        ],
        sentence: "正解！！ ● は右側の19目、",
        operations: ["showSentence", "showTerritory", "showNextButton"],
      },
      {
        ...defaultScreen,

        territoryBoard: [
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 0, 2, 0, 0, 1, 0, 1],
          [0, 0, 2, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
        ],
        sentence: "○は左上7目、",
        operations: [
          "showSentence",
          "showTerritory",
          "showNextButton",
          "showBackButton",
        ],
      },
      {
        ...defaultScreen,

        territoryBoard: [
          [2, 2, 2, 0, 0, 0, 1, 1, 1],
          [2, 2, 0, 2, 0, 0, 1, 0, 1],
          [0, 0, 2, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 0, 0, 0, 0, 1, 1],
          [0, 0, 2, 0, 0, 0, 0, 1, 1],
          [2, 2, 2, 2, 2, 0, 0, 1, 1],
        ],
        sentence: "○ 左下5目。",
        operations: [
          "showSentence",
          "showTerritory",
          "showNextButton",
          "showBackButton",
        ],
      },

      {
        ...defaultScreen,
        sentence:
          "よって、\n● 19目、\n○ 12目 + コミ6.5目の計18.5目で、\n● の0.5目勝ちだよ！",
      },

      {
        ...defaultScreen,
        sentence: "よくできたね。次回は、石を取る練習をしてみよう！",
      },
    ],

    [
      {
        ...defaultScreen,
        sentence: `やっほー、${displayname}。待ってたよ`,
        operations: ["showSentence", "showNextButton"],
      },

      {
        ...defaultScreen,
        sentence:
          "囲碁では、石を囲んだら取ることができる、って聞いたことはあるかな？",
      },
      {
        ...defaultScreen,
        sentence: "実はそのとおりで、相手の石の上下左右を囲むと取れるんだ！",
      },
      {
        ...defaultScreen,
        sentence: "早速やってみるね",
        botSetBoard: ["7,6", "7,7", "6,7", "p", "7,8", "p"],
        operations: ["showSentence", "botSetBoard", "autoGoNext"],
      },
      {
        ...defaultScreen,
        sentence: "このような盤面があったとき、",
      },
      {
        ...defaultScreen,
        sentence: "このように打つことで、石を取ることができるんだ",
        botApplyMove: ["8,7"],
        operations: [
          "botApplyMove",
          "showSentence",
          "showNextButton",
          "showBackButton",
        ],
      },
      {
        ...defaultScreen,
        sentence:
          "碁盤の上の方に ○ があると思うんだけど、これは取った石を表しているよ",
      },
      {
        ...defaultScreen,
        sentence: "囲まれて盤上から取り去られた石のことをアゲハマというよ",
      },
      {
        ...defaultScreen,
        sentence:
          "アゲハマは終局後に相手の陣地に置くことで相手の陣地を減らすことができるんだ",
      },
      {
        ...defaultScreen,
        sentence: `次は${displayname}の番だよ`,
        botApplyMove: ["4,4", "3,4", "3,3", "p", "3,5", "p"],
        operations: ["showSentence", "botApplyMove", "autoGoNext"],
      },
      {
        ...defaultScreen,
        sentence: "黒石を取ってみよう！",
        canPutStones: ["2,4"],
        operations: ["showSentence", "userPlay", "autoGoNext"],
      },
      {
        ...defaultScreen,
        sentence: "上手！！",
        operations: ["showSentence", "showNextButton"],
      },
      {
        ...defaultScreen,
        sentence: "端っこや隅も、同じように取ることができるよ",
      },

      {
        ...defaultScreen,
        sentence: "このような盤面があったとき、",
        botSetBoard: ["5,8", "5,9", "4,9", "8,9", "9,9", "p"],
        operations: [
          "botSetBoard",
          "showSentence",
          "showNextButton",
          "showBackButton",
        ],
      },

      {
        ...defaultScreen,
        sentence: "このように打つことで、端っこの石を取れるし、",
        botApplyMove: ["6,9"],
        operations: ["botApplyMove", "showSentence", "showNextButton"],
      },

      {
        ...defaultScreen,
        sentence: "このように打つことで、隅っこの石も取れるんだ",
        botApplyMove: ["9,8"],
        operations: ["botApplyMove", "showSentence", "showNextButton"],
      },

      { ...defaultScreen, sentence: `${displayname}の番だよ` },
      {
        ...defaultScreen,
        sentence: "端っこの ○ を取ってみよう！",
        botSetBoard: ["5,8", "5,9", "4,9", "8,9", "9,9", "p"],

        canPutStones: ["6,9"],
        operations: ["botSetBoard", "showSentence", "userPlay", "autoGoNext"],
      },
      { ...defaultScreen, sentence: "完璧！！" },
      {
        ...defaultScreen,
        sentence: "隅っこの ● も取ってみよう！",
        canPutStones: ["9,8"],
        operations: ["showSentence", "userPlay", "autoGoNext"],
      },
      { ...defaultScreen, sentence: "完璧！！" },
      {
        ...defaultScreen,
        sentence: "すごくよくできたね。",
      },
      {
        ...defaultScreen,
        sentence: "実は、囲碁には打ってはいけない場所があるって知ってた？",
      },
      {
        ...defaultScreen,
        sentence: "次回はそれを一緒に見ていこうね！",
      },
    ],

    [
      {
        ...defaultScreen,
        sentence: `やっほー、${displayname}。待ってたよ`,
        operations: ["showSentence", "showNextButton"],
      },
      // {
      //   ...defaultScreen,
      //   sentence:
      //     "ここまで、二つのことを学んだね：\n①囲碁は●と○が交互に打つ陣地取りゲーム\n②石を囲んだら取れる",
      // },
      // { ...defaultScreen, sentence: "めっちゃ簡単なルールでしょ？" },
      // {
      //   ...defaultScreen,
      //   sentence:
      //     "実はもう一つだけルールがあって、それが\n「打てない場所がある」\nなんだ。",
      // },
      // {
      //   ...defaultScreen,
      //   sentence: "例えば、",
      //   botSetBoard: ["4,5", "p", "5,4", "p", "6,5", "p", "5,6"],
      //   operations: [
      //     "showSentence",
      //     "botSetBoard",
      //     "showNextButton",
      //     "showBackButton",
      //     "autoGoNext",
      //   ],
      // },
      // {
      //   ...defaultScreen,
      //   sentence:
      //     "こんな盤面があった時、白は真ん中の点に打つことができないんだ",
      // },
      // {
      //   ...defaultScreen,
      //   sentence:
      //     "なぜかというと、前回学んだことは...そう、\n「石は上下左右を囲むと取れる」\nだよね",
      // },
      // {
      //   ...defaultScreen,
      //   sentence:
      //     "真ん中の点に ○ が打ててしまうと、打った瞬間 ● に上下左右を囲まれて取られちゃうから、打てないことになっているんだ",
      // },
      // {
      //   ...defaultScreen,
      //   sentence: "でも、",
      // },
      // {
      //   ...defaultScreen,
      //   sentence: "白は打てないけど、黒はこのように打てるからね",
      //   botApplyMove: ["p", "5,5"],
      //   operations: [
      //     "botApplyMove",
      //     "showSentence",
      //     "showNextButton",
      //     "showBackButton",
      //   ],
      // },

      // {
      //   ...defaultScreen,
      //   sentence:
      //     "実は「相手の石に囲まれてる場所には打てない」には例外があるんだ",
      // },
      // {
      //   ...defaultScreen,
      //   botSetBoard: [
      //     "6,4",
      //     "6,5",
      //     "5,4",
      //     "5,5",
      //     "4,5",
      //     "4,6",
      //     "4,4",
      //     "4,7",
      //     "7,5",
      //     "7,6",
      //     "7,4",
      //     "5,7",
      //     "5,6",
      //     "6,7",
      //   ],
      //   sentence: "このような盤面で、 ● は",
      //   operations: [
      //     "botSetBoard",
      //     "showSentence",
      //     "showNextButton",
      //     "showBackButton",
      //   ],
      // },
      // {
      //   ...defaultScreen,
      //   botApplyMove: ["6,6"],
      //   sentence: "こう打つことができるんだ",
      //   operations: [
      //     "botApplyMove",
      //     "showSentence",
      //     "showNextButton",
      //     "showBackButton",
      //   ],
      // },
      // {
      //   ...defaultScreen,
      //   botReplayMove: 1,
      //   sentence:
      //     "このように、相手の石を取ることができる場合は、相手の石に上下左右が囲まれているところでも打ってもいいんだね",
      //   operations: [
      //     "botReplayMove",
      //     "showSentence",
      //     "showNextButton",
      //     "showBackButton",
      //   ],
      // },
      // {
      //   ...defaultScreen,
      //   sentence: "さて、実はもう一つだけ打てない場所があるんだ",
      // },
      // { ...defaultScreen, sentence: "それが「コウ」" },
      {
        ...defaultScreen,
        sentence: "次回はコウについて学ぼう！",
      },
    ],
    [
      {
        ...defaultScreen,
        sentence: `やっほー、${displayname}。待ってたよ`,
        operations: ["showSentence", "showNextButton"],
      },
    ],
  ];
};

// ==================== Context ====================
type TutorialContextType = {
  screens: MyScreen[][];
  currentTutorialIndex: number;
};

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined,
);

export const TutorialProvider: React.FC<{
  children: React.ReactNode;
  displayname: string;
  currentTutorialIndex: number;
}> = ({ children, displayname, currentTutorialIndex }) => {
  const screens = getTutorialScreens(displayname);

  return (
    <TutorialContext.Provider value={{ screens, currentTutorialIndex }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
};
