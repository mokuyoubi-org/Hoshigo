import React from "react";
import { View } from "react-native";

type Props = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  // children でも right でもどちらでも受け取れるようにしておくと便利
  children?: React.ReactNode;
};

/**
 * 画面上部の共通ヘッダーコンポーネント
 * 左側(left)と右側(right/children)に自由な要素を配置できます。
 */
export const Header = ({ left, right, children }: Props) => {
  return (
    <View className="flex-row justify-between items-center py-1">
      <View className="flex-row items-center">{left}</View>
      <View className="flex-row items-center gap-2">{right ?? children}</View>
    </View>
  );
};