// MyHeader.tsx

import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  left?: ReactNode;
  right?: ReactNode;
  // children でも right でもどちらでも受け取れるようにしておくと便利
  children?: ReactNode;
};

/**
- 画面上部の共通ヘッダーコンポーネント
- 左側(left)と右側(right/children)に自由な要素を配置できます。
 */
export const MyHeader = ({ left, right, children }: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>{left}</View>
      <View style={styles.rightContainer}>{right ?? children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4, // py-1 (4px)
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // gap-2 (8px)
  },
});
