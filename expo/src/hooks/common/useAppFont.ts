// useAppFont.ts

import { getAppFont } from "@/src/constants/fonts";
import { useLang } from "@/src/i18n/LangProvider";

// いまの言語に合うフォント名を返す。ui-atoms などの部品に fontFamily として渡す用
export const useAppFont = (): string => {
  // Provider の外で呼ばれても落ちないように、未定義なら日本語扱いにする(MyText と同じ)
  const langContext = useLang();
  return getAppFont(langContext?.lang ?? "ja");
};
