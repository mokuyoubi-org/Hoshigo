import { ImageSourcePropType } from "react-native";

// アイコンの配列
export const ICONS: Record<number, ImageSourcePropType> = {
  0: require("@/assets/images/0.png"), // ペンギン
  1: require("@/assets/images/1.png"), // ひよこ
  2: require("@/assets/images/2.png"), // いるか
  3: require("@/assets/images/3.png"), // コアラ
  4: require("@/assets/images/4.png"), // カエル
  5: require("@/assets/images/5.png"), // 猫
  6: require("@/assets/images/6.png"), // お化け
  7: require("@/assets/images/7.png"), // フクロウ
  8: require("@/assets/images/8.png"), // くらげ
  9: require("@/assets/images/9.png"), // ウーパールーパー
  10: require("@/assets/images/10.png"), // くじら
  11: require("@/assets/images/11.png"), // くろまる
  12: require("@/assets/images/12.png"), // しろまる
  13: require("@/assets/images/13.png"), // 恐竜
  14: require("@/assets/images/14.png"), // 恐竜ドリンク
  20: require("@/assets/images/20.png"), // うどん
  21: require("@/assets/images/21.png"), // おせんべい
  22: require("@/assets/images/22.png"), // せな
  23: require("@/assets/images/23.png"), // るな
  24: require("@/assets/images/24.png"), // うさぎ先生
};



// まずユーザが獲得できるアイコンとそれ以外のアイコンは分ける
// デフォルトアイコン: ペンギン
// オレンジ: ひよこ
// 青: いるか
// そら3: こあら
// にじ3: くらげ
// つき3: ふくろう
// ほし3: くじら

// 1000戦: 男の子女の子
// 



// type UnlockRule =
//   | { type: "always" }
//   | { type: "gumi"; value: number }
//   | { type: "games"; value: number };

// type IconData = {
//   id: number;
//   image: any;
//   unlock: UnlockRule;
// };


// export const ICONS = [
//   {
//     id: 0,
//     image: require("./cat.png"),
//     unlock: { type: "always" }
//   },
//   {
//     id: 1,
//     image: require("./dog.png"),
//     unlock: { type: "gumi", value: 3 }
//   },
//   {
//     id: 2,
//     image: require("./ghost.png"),
//     unlock: { type: "wins", value: 100 }
//   },
// ];


// function canUseIcon(
//   icon: IconData,
//   user: { gumiIndex?: number; games?: number },
//   currentEvent?: string
// ): boolean {
//   const rule = icon.unlock;

//   switch (rule.type) {
//     case "always":
//       return true;

//     case "gumi":
//       return (user.gumiIndex ?? 0) >= rule.value;

//     case "games":
//       return (user.games ?? 0) >= rule.value;

//     default:
//       return false;
//   }
// }