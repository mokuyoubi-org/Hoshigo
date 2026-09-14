// constants/icons.ts
import { ImageSourcePropType } from "react-native";

export const ICONS: Record<number | string, ImageSourcePropType> = {
  // 自分
  0: require("@/assets/images/0.png"), // デフォルト
  1: require("@/assets/images/1.png"), // 計100勝
  2: require("@/assets/images/2.png"), // 計200勝
  3: require("@/assets/images/3.png"), // 計300勝
  4: require("@/assets/images/4.png"), // 計500勝
  5: require("@/assets/images/5.png"), // 計700勝

  6: require("@/assets/images/6.png"), // 9路で1000勝
  7: require("@/assets/images/7.png"), // 9路で2000勝
  8: require("@/assets/images/8.png"), // 13路で1000勝
  9: require("@/assets/images/9.png"), // 13路で2000勝
  10: require("@/assets/images/10.png"), // 19路で1000勝
  11: require("@/assets/images/11.png"), // 19路で2000勝

  // ボット
  100: require("@/assets/images/100.png"), // bot1
  101: require("@/assets/images/101.png"), // bot2
  102: require("@/assets/images/102.png"), // bot3
};
