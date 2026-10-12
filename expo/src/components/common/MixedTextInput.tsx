// MixedTextInput.tsx

import { getAppFont } from "@/src/constants/fonts";
import { useLang } from "@/src/i18n/LangProvider";
import { resolveUiLang, splitRuns } from "@/src/logics/format/mixedRuns";
import { forwardRef, useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
} from "react-native";

// 🔀⌨️ 何を入力されるか分からない欄（ユーザー名の入力など）用の TextInput。
// 入力した文字ごとに JA / SC / KO / EN のフォントを自動で振り分けます。
// 普段の入力欄は AppTextInput を使ってください。
//
// ⚠️ しくみ: TextInput の子に <Text> を並べると、文字ごとにフォントを変えられます。
//   そのため value は TextInput に直接渡さず、子の <Text> として描画しています。
//   （value / defaultValue / onChangeText は普通の TextInput と同じように使えます）
// ⚠️ Web は input タグなので文字ごとの切り替えができず、UI言語のフォント1つになります。
export const MixedTextInput = forwardRef<TextInput, TextInputProps>(
  ({ style, value, defaultValue, onChangeText, children, ...props }, ref) => {
    const langContext = useLang();
    const ui = resolveUiLang(langContext?.lang);

    if (__DEV__ && !langContext) {
      console.warn(
        "MixedTextInput is used outside LangProvider",
        new Error().stack,
      );
    }

    // 非制御（value を渡さない使い方）でも色分けできるよう、中身を自分でも覚えておく
    const [inner, setInner] = useState(defaultValue ?? "");
    const text = value ?? inner;

    const runs = useMemo(() => splitRuns(text, ui), [text, ui]);

    // style で fontFamily を指定されたら、その指定を尊重して分割しない
    const hasOverride = !!StyleSheet.flatten(style)?.fontFamily;
    const baseStyle = [{ fontFamily: getAppFont(ui) }, style];

    // 分割できない／しない場合は、普通の TextInput(AppTextInput と同じ動き)
    if (Platform.OS === "web" || hasOverride || props.secureTextEntry) {
      return (
        <TextInput
          ref={ref}
          style={baseStyle}
          value={value}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          {...props}
        />
      );
    }

    const handleChangeText = (t: string) => {
      setInner(t);
      onChangeText?.(t);
    };

    return (
      <TextInput
        ref={ref}
        style={baseStyle}
        onChangeText={handleChangeText}
        {...props}
      >
        {runs.map((r, i) => (
          <Text key={i} style={{ fontFamily: getAppFont(r.lang) }}>
            {r.text}
          </Text>
        ))}
      </TextInput>
    );
  },
);

MixedTextInput.displayName = "MixedTextInput";
