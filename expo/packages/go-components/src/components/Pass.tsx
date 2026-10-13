// Pass.tsx

import { ColorValue, StyleSheet } from "react-native";
import { Bubble } from "ui-atoms";

type Props = {
  visible?: boolean;
  isLeft: boolean;
  backgroundColor: ColorValue; // 吹き出しの背景色
  borderColor: ColorValue; // 枠線・しっぽの枠線の色
  textColor: ColorValue; // 文字色
  passText: string;
  fontFamily: string; // 文字のフォント(省略時はシステムのフォント)
};

// しっぽを、吹き出しの左右の端から何px内側に置くか
const TAIL_OFFSET = 10;

export const Pass = ({
  visible = true,
  isLeft,
  backgroundColor,
  borderColor,
  textColor,
  passText,
  fontFamily,
}: Props) => {
  const fontStyle = fontFamily ? { fontFamily } : null;

  return (
    <Bubble
      text={passText}
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      textColor={textColor}
      tailDirection="down"
      tailLeft={isLeft ? TAIL_OFFSET : undefined}
      tailRight={isLeft ? undefined : TAIL_OFFSET}
      fontStyle={fontStyle}
      textProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
      style={[styles.container, !visible && styles.hidden]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
  },
  hidden: {
    opacity: 0,
  },
});
