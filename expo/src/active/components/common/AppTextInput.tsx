import { useAppFont } from "@/src/active/hooks/useAppFont";
import React, { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";

// ⌨️ アプリ標準の TextInput。言語に合わせたフォントが自動で入ります。
// react-native の TextInput の代わりに、これを使ってください。
// 個別に変えたいときは style={{ fontFamily: "..." }} で上書きできます。
export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  ({ style, ...props }, ref) => {
    const fontFamily = useAppFont();
    return <TextInput ref={ref} style={[{ fontFamily }, style]} {...props} />;
  },
);

AppTextInput.displayName = "AppTextInput";
