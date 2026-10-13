// MixedText.tsx

import { getAppFont } from "@/src/constants/fonts";
import { useLang } from "@/src/i18n/LangProvider";
import { resolveUiLang, splitRuns } from "@/src/logics/format/mixedRuns";
import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

// 文字列・数値（とその配列）だけ分割対象にする。それ以外は通常表示
const toStr = (c: ReactNode): string | null =>
  typeof c === "string" || typeof c === "number"
    ? String(c)
    : Array.isArray(c) &&
        c.every((x) => typeof x === "string" || typeof x === "number")
      ? c.join("")
      : null;

// 🔀 中身が分からない文字列（ユーザー名など）用の Text。
// 文字ごとに JA / SC / KO / EN のフォントを自動で振り分けます。
// 普段の固定文言は MyText を使ってください。
export const MixedText = ({ style, children, ...props }: TextProps) => {
  const langContext = useLang();
  const ui = resolveUiLang(langContext?.lang);

  if (__DEV__ && !langContext) {
    console.warn("MixedText is used outside LangProvider", new Error().stack);
  }

  const text = toStr(children);
  const runs = useMemo(
    () => (text === null ? null : splitRuns(text, ui)),
    [text, ui],
  );

  // style で fontFamily を指定されたら、その指定を尊重して分割しない
  const hasOverride = !!StyleSheet.flatten(style)?.fontFamily;

  if (runs === null || hasOverride) {
    return (
      <Text style={[{ fontFamily: getAppFont(ui) }, style]} {...props}>
        {children}
      </Text>
    );
  }

  return (
    <Text style={style} {...props}>
      {runs.map((r, i) => (
        <Text key={i} style={{ fontFamily: getAppFont(r.lang) }}>
          {r.text}
        </Text>
      ))}
    </Text>
  );
};
