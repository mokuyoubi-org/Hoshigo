// constants/icons.ts
import { getImageUrl } from "assets-kit/src/r2";
import { ImageSourcePropType } from "react-native";

export const ICONS: Record<number | string, ImageSourcePropType> = {
  // 自分
  0: { uri: getImageUrl("chick.png") },
  1: { uri: getImageUrl("frog.png") },
  2: { uri: getImageUrl("jellyfish.png") },
  3: { uri: getImageUrl("fox.png") },
  4: { uri: getImageUrl("owl.png") },
  5: { uri: getImageUrl("koala.png") },

  6: { uri: getImageUrl("rabbit.png") }, // 変える時はAvatar.tsxも変えること
  7: { uri: getImageUrl("cat.png") },
  8: { uri: getImageUrl("wolf.png") },

  // ボット
  100: { uri: getImageUrl("bot1.png") },
  101: { uri: getImageUrl("bot2.png") },
  102: { uri: getImageUrl("bot3.png") },
};
