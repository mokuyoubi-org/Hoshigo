import { getAppFont } from "@/src/active/constants/fonts";
import { useLang } from "@/src/active/i18n/LangProvider";
import React from "react";
import { Text, type TextProps } from "react-native";

// 🅰️ アプリ標準の Text。言語に合わせたフォントが自動で入ります。
// react-native の Text の代わりに、これを使ってください。
// 個別に変えたいときは style={{ fontFamily: "..." }} で上書きできます。
export const AppText = ({ style, ...props }: TextProps) => {
  // Provider の外で呼ばれても落ちないように、未定義なら日本語扱いにする
  const langContext = useLang();
  const lang = langContext?.lang ?? "ja";

  // 🕵️ 開発中だけ: Provider の外で使われたら、呼び出し元をコンソールに出す
  if (__DEV__ && !langContext) {
    console.warn("AppText is used outside LangProvider", new Error().stack);
  }

  return <Text style={[{ fontFamily: getAppFont(lang) }, style]} {...props} />;
};
/*
2026/10/01
もし、Webにて、テキストの色が動的に変わって欲しいのに変わらない場合、classnameではなく直接書くこと。

<AppText
className={`text-lg ${isSelected ? "text-text" : "text-textSub"}`}
>

こうではなく、 

<AppText
style={{
fontSize: 18,
color: isSelected ? colors.text : colors.textSub,
}}
>

こう書く。*/