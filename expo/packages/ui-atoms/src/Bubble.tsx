// Bubble.tsx
// 吹き出しを描く部品。
// 色・文字・しっぽの向きや位置は全部 props で受け取る。
// 置き場所（absolute の left/top など）は持たず、呼ぶ側が決める。

import {
  ColorValue,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

const BORDER_WIDTH = 2; // 吹き出し本体の枠線の太さ

// しっぽ（三角）の大きさ。呼ぶ側が位置計算に使えるように export しておく
export const BUBBLE_TAIL_SIZE = 5;

type Props = {
  /** 吹き出しに表示する文字 */
  text: string | number;
  /** 吹き出しの背景色（しっぽの塗りつぶしもこの色） */
  backgroundColor: ColorValue;
  /** 枠線・しっぽの枠線の色 */
  borderColor: ColorValue;
  /** 文字色 */
  textColor: ColorValue;
  /** "down" = しっぽが下(▼) / "up" = しっぽが上(▲)。デフォルトは "down" */
  tailDirection?: "down" | "up";
  /** しっぽの左端が、吹き出しの左端から何px右か（tailRight より優先） */
  tailLeft?: number;
  /** しっぽの右端が、吹き出しの右端から何px左か。tailLeft も tailRight も省略すると真ん中 */
  tailRight?: number;
  /** 吹き出し本体の横幅。省略すると文字に合わせて広がる */
  width?: number;
  /** 吹き出し本体の高さ。省略すると文字に合わせて広がる */
  height?: number;
  /** 文字のスタイル（fontFamily など） */
  fontStyle?: StyleProp<TextStyle>;
  /** 文字に渡したい props（numberOfLines など） */
  textProps?: TextProps;
  /** 外側の View のスタイル */
  style?: StyleProp<ViewStyle>;
};

export const Bubble = ({
  text,
  backgroundColor,
  borderColor,
  textColor,
  tailDirection = "down",
  tailLeft,
  tailRight,
  width,
  height,
  fontStyle,
  textProps,
  style,
}: Props) => {
  const isTailUp = tailDirection === "up";

  // しっぽの横位置：左から / 右から / 真ん中
  const tailPositionStyle: ViewStyle =
    tailLeft !== undefined
      ? { alignSelf: "flex-start", marginLeft: tailLeft }
      : tailRight !== undefined
        ? { alignSelf: "flex-end", marginRight: tailRight }
        : { alignSelf: "center" };

  // 吹き出し本体
  const body = (
    <View
      style={[
        styles.body,
        {
          backgroundColor,
          borderColor,
          width,
          height,
          // サイズを固定しないときだけ、ふちの余白をつける
          paddingHorizontal: width === undefined ? 8 : 0,
          paddingVertical: height === undefined ? 4 : 0,
        },
      ]}
    >
      <Text
        {...textProps}
        style={[styles.text, { color: textColor }, fontStyle]}
      >
        {text}
      </Text>
    </View>
  );

  // しっぽ（枠線の三角 + 塗りつぶしの細長い三角を重ねる）
  const tail = (
    <View style={[styles.tail, tailPositionStyle]}>
      {/* しっぽの枠線 */}
      <View
        style={
          isTailUp
            ? [styles.tailUpBorder, { borderBottomColor: borderColor }]
            : [styles.tailDownBorder, { borderTopColor: borderColor }]
        }
      />

      {/* しっぽの塗りつぶし：本体の枠線の部分だけ見えるように窓で切り取る */}
      <View
        style={[
          styles.tailFillWindow,
          isTailUp ? styles.tailFillWindowUp : styles.tailFillWindowDown,
        ]}
      >
        <View
          style={
            isTailUp
              ? [styles.tailUpFill, { borderBottomColor: backgroundColor }]
              : [styles.tailDownFill, { borderTopColor: backgroundColor }]
          }
        />
      </View>
    </View>
  );

  return (
    <View style={style}>
      {isTailUp && tail}
      {body}
      {!isTailUp && tail}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    borderWidth: BORDER_WIDTH,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 12,
    includeFontPadding: false, // ⚠️Android用。大事
  },
  // しっぽを入れる箱（本体より手前に描く）
  tail: {
    position: "relative",
    width: BUBBLE_TAIL_SIZE * 2,
    height: BUBBLE_TAIL_SIZE,
    zIndex: 1,
  },
  // 塗りつぶしの三角を切り取る窓（高さ = しっぽ + 本体の枠線の太さ）
  tailFillWindow: {
    position: "absolute",
    left: 0,
    width: BUBBLE_TAIL_SIZE * 2,
    height: BUBBLE_TAIL_SIZE + BORDER_WIDTH,
    overflow: "hidden",
  },
  tailFillWindowDown: {
    bottom: 0,
  },
  tailFillWindowUp: {
    top: 0,
  },
  // 下向きの三角（枠線）
  tailDownBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: BUBBLE_TAIL_SIZE,
    borderRightWidth: BUBBLE_TAIL_SIZE,
    borderTopWidth: BUBBLE_TAIL_SIZE,
    borderLeftColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
    borderRightColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
  },
  // 下向きの三角（塗りつぶし）
  tailDownFill: {
    position: "absolute",
    bottom: 1,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: BUBBLE_TAIL_SIZE,
    borderRightWidth: BUBBLE_TAIL_SIZE,
    borderTopWidth: BUBBLE_TAIL_SIZE * 2,
    borderLeftColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
    borderRightColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
  },
  // 上向きの三角（枠線）
  tailUpBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: BUBBLE_TAIL_SIZE,
    borderRightWidth: BUBBLE_TAIL_SIZE,
    borderBottomWidth: BUBBLE_TAIL_SIZE,
    borderLeftColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
    borderRightColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
  },
  // 上向きの三角（塗りつぶし）
  tailUpFill: {
    position: "absolute",
    top: 1,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: BUBBLE_TAIL_SIZE,
    borderRightWidth: BUBBLE_TAIL_SIZE,
    borderBottomWidth: BUBBLE_TAIL_SIZE * 2,
    borderLeftColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
    borderRightColor: "transparent", // このtransparentはAndroidでもちゃんと効いてるので大丈夫
  },
});
