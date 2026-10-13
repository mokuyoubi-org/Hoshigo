// Agehama.tsx

import { ColorValue, StyleSheet, Text } from "react-native";

type Props = {
  count: number;
  /** 文字色（黒石なら白、白石なら黒を渡す） */
  color: ColorValue;
  /** 数字を書くスペースの大きさ（石のサイズを渡す） */
  size: number;
  fontFamily?: string;
};

export const Agehama = ({ count, color, size, fontFamily }: Props) => {
  const digits = String(count).length;

  // 1桁: 大きめ / 桁が増えるほど小さく。
  // 数字全体の横幅が size の約5割に収まるように計算している
  const fontSize = size * Math.min(0.55, 0.9 / digits);

  return (
    <Text
      numberOfLines={1}
      style={[
        styles.text,
        { fontSize, color },
        fontFamily ? { fontFamily } : null,
      ]}
    >
      {count}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: "600",
    includeFontPadding: false,
    textAlign: "center",
  },
});
