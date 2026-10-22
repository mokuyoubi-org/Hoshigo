// common.ts

import { ReactNode } from "react";
import { ColorValue, StyleProp, ViewStyle } from "react-native";

export type ModalSize = "sm" | "md" | "lg";

const MAX_WIDTHS: Record<ModalSize, number> = {
  sm: 240,
  md: 320,
  lg: 400,
};

const WIDTH_RATIO = 0.88;
const HEIGHT_RATIO = 0.84;
export const DEFAULT_CONTENT_PADDING = 20;

export const computeModalBox = (
  windowWidth: number,
  windowHeight: number,
  size: ModalSize,
) => {
  const width = Math.min(windowWidth * WIDTH_RATIO, MAX_WIDTHS[size]);
  const maxHeight = windowHeight * HEIGHT_RATIO;
  return { width, maxHeight };
};

export type ModalShellProps = {
  children: ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  dismissKeyboardOnPress?: boolean;
  backgroundColor: ColorValue;
  borderColor: ColorValue;
  overlayColor: ColorValue;
  size: ModalSize;
  contentPadding?: number;
};
