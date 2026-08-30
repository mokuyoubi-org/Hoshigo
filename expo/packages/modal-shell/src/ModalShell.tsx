// ModalShell.tsx(共通)
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ModalSize } from "./modalSizing";

export type { ModalSize };

export type ModalShellProps = {
  children: React.ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  dismissKeyboardOnPress?: boolean;
  backgroundColor?: string;
  size?: ModalSize;
};

// 🐾 TypeScriptの型解決用（実行時はWeb/Nativeの各実装ファイルに分岐する）
export declare function ModalShell(props: ModalShellProps): React.JSX.Element;
