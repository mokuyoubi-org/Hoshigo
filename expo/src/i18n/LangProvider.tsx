// LangProvider.tsx
// 2026/10/11: 整理

// i18n-kitというのは、要は辞書を渡したらそれを完全暗記した
// 通訳さんを生成してくれる、工場のような存在。

// LangProviderは、❶起動時の出発地点。
// 1. 起動されると、kvstoreら保存済みの言語を取り出して、langにセットする
// 2. もしなければ端末の言語をlangにsetする。もし端末の言語がenでもjaでもkoでもzhでもなければenになる
// 3. langを全画面に配る

// ❷また、言語が変更されたときはそれにすぐに気づく係でもある。
// 1. LanguageModalで言語変更する
// 2. kvstorageに保存される
// 3. Providerが変更に気づき、みんなに伝える。

// なお、言語を使いたいときは、既知の通り、
// const t = useTranslation();
// でt関数を召喚するのみ。

// 要は、言語の変化検知、保存を担当する。
// expo-katagoでプロバイダが不要になってるのは、変化検知も保存も彼らは担当していない、
// つまりアプリの本部側であるここに任せてるから。

import { getLocales } from "expo-localization";
import { useKVStorage } from "kv-store";
import { createContext, ReactNode, useContext } from "react";
import { translate } from ".";
import { LANGS, type Lang, type TFunction } from "./types";

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>(null);

// 端末の言語が対応言語ならそれ、なければen
const getDeviceDefaultLang = (): Lang => {
  const code = getLocales()[0]?.languageCode ?? "en";
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : "en";
};

export const LangProvider = ({ children }: { children: ReactNode }) => {
  //  言語の「唯一の正解」はKVStorage。ここ以外でuseKVStorage("global.language")は使わない。
  const { value: storedLang, setValue: setLang } = useKVStorage<Lang | null>(
    "global.language",
    null,
  );

  // 保存値があればそれ、なければ端末言語
  const lang = storedLang ?? getDeviceDefaultLang();

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
};

export const useTranslation = (): TFunction => {
  const { lang } = useLang();
  return (key, params) => translate(key, lang, params);
};
