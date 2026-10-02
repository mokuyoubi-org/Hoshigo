// src/active/i18n/LangSync.tsx
import { getLocales } from "expo-localization";
import { LangOf, resolveDefaultLang } from "i18n-kit";
import { useEffect, useRef } from "react";
import { useKVStorage } from "storage-kit";
import { dictionary } from "./dictionary";
import { useLang } from "./LangProvider";
import { LANGUAGE_STORAGE_KEY } from "./langStorageKey";

type Lang = LangOf<typeof dictionary>;

// ------------------------------------------------------------------ //
// LangSync
// 責務: KVStorage("global.language")とLangContextの状態を同期する
// - 保存値があればそれをLangContextへ反映
// - 保存値がなければ端末言語(サポート外ならen)を決定し、KVStorageへ保存
// - LanguageModal側でsetLanguageされた変更も自動でLangContextへ反映される
// ------------------------------------------------------------------ //
export function LangSync() {
  const { setLang } = useLang();
  const {
    value: storedLang,
    setValue: setStoredLang,
    isLoaded,
  } = useKVStorage<Lang | null>(LANGUAGE_STORAGE_KEY, null);
  const didInitDefault = useRef(false);

  // ① 初回のみ: 保存値がなければ端末言語から初期値を決めてKVStorageへ保存する
  useEffect(() => {
    if (!isLoaded || didInitDefault.current) return;
    didInitDefault.current = true;
    if (storedLang) return;

    const deviceLang = getLocales()[0]?.languageCode ?? "en";
    setStoredLang(resolveDefaultLang(dictionary, deviceLang));
  }, [isLoaded, storedLang, setStoredLang]);

  // ② storedLangが変わるたび(初回ロード時 / LanguageModalでの選択時 両方)LangContextへ反映
  useEffect(() => {
    if (!isLoaded || !storedLang) return;
    setLang(storedLang);
  }, [isLoaded, storedLang, setLang]);

  return null;
}