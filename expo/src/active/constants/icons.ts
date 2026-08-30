// constants/icons.ts
import { ImageSourcePropType } from "react-native";

export const ICONS: Record<number | string, ImageSourcePropType> = {
  // 自分
  0: require("@/assets/images/chick.png"), // 10~8k
  1: require("@/assets/images/frog.png"), // 7~5k
  2: require("@/assets/images/jellyfish.png"), // 4~2k
  3: require("@/assets/images/ghost.png"), // 1k~2D
  4: require("@/assets/images/koala.png"), // 3~5D
  5: require("@/assets/images/owl.png"), // 6~8D
  // ボット
  100: require("@/assets/images/Sena.png"), // bot1
  101: require("@/assets/images/Luna.png"), // bot2
  102: require("@/assets/images/MrRabbit.png"), // bot3
};
