// src/components/layout/FullScreenLayer.tsx

import type { ReactNode } from "react";
import { View } from "react-native";

type Props = {
  zIndex: number;
  children: ReactNode;
};

// 画面いっぱいに被せる「ふすま」のような部品。
// ローディング・メンテ・アップデートの3つが同じ形なので、ここにまとめています。
export const FullScreenLayer = ({ zIndex, children }: Props) => (
  <View
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex,
    }}
  >
    {children}
  </View>
);