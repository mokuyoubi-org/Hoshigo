import { Animated, ColorValue } from "react-native";

export type FloatingToastColors = {
  background?: string;
  border?: string;
  accent?: string;
  surface?: string;
  text?: string;
  textSub?: string;
};

export type FloatingToastProps = {
  /** 表示するか。falseになった後も退場アニメが終わるまでは内部的にレンダリングされ続ける */
  visible: boolean;
  label: string;
  /** trueの間：先頭スピナーを隠し、アクションボタンをスピナー表示にして無効化する */
  busy?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  bottomOffset?: number;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  backgroundColor: ColorValue;
  borderColor: ColorValue;
  accentColor: ColorValue;
  textColor: ColorValue;
  textSubColor: ColorValue;
  foregroundColor: ColorValue;
};
