// components/MyImage.tsx

import { Image, type ImageProps } from "expo-image";
import { useColorScheme } from "nativewind";
import React from "react";

// 🌙 ダークモード時の透明度(1が元のまま、小さいほど薄い)
const DEFAULT_DARK_OPACITY = 0.8;

type AppImageProps = ImageProps & {
  // 🎚️ 画像ごとに暗さを変えたい時だけ指定する
  darkOpacity?: number;
};

export const MyImage = ({
  darkOpacity = DEFAULT_DARK_OPACITY,
  style,
  ...rest
}: AppImageProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Image {...rest} style={[style, isDark && { opacity: darkOpacity }]} />
  );
};
