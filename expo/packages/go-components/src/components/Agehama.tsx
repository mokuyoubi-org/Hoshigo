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

  // 💡 桁数に応じて、石のサイズに対する割合を調整するにゃ！
  // 1桁なら石のサイズの約55%、2桁なら約45%、3桁なら約35%くらいにするにゃ
  let scale = 0.64;
  if (digits === 2) {
    scale = 0.48;
  } else if (digits >= 3) {
    scale = 0.36; // 3桁以上になってもこれ以上小さくなりすぎないようにストップするにゃ！
  }

  const fontSize = size * scale;

  return (
    <Text
      numberOfLines={1}
      style={[
        styles.text,
        {
          fontSize,
          color,
          transform: [{ translateY: -fontSize * 0.1 }],
        },
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
    textAlign: "center",
    includeFontPadding: false, // ⚠️Android用。大事
  },
});
