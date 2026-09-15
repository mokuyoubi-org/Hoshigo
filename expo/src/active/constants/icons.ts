// constants/icons.ts
import { ImageSourcePropType } from "react-native";
import { getImageUrl } from "sound-kit/src/r2";

export const ICONS: Record<number | string, ImageSourcePropType> = {
  // 自分
  0: { uri: getImageUrl("0.png") },
  1: { uri: getImageUrl("1.png") },
  2: { uri: getImageUrl("2.png") },
  3: { uri: getImageUrl("3.png") },
  4: { uri: getImageUrl("4.png") },
  5: { uri: getImageUrl("5.png") },

  6: { uri: getImageUrl("6.png") },
  7: { uri: getImageUrl("7.png") },
  8: { uri: getImageUrl("8.png") },
  9: { uri: getImageUrl("9.png") },
  10: { uri: getImageUrl("10.png") },
  11: { uri: getImageUrl("11.png") },

  // ボット
  100: { uri: getImageUrl("100.png") },
  101: { uri: getImageUrl("101.png") },
  102: { uri: getImageUrl("102.png") },
};
