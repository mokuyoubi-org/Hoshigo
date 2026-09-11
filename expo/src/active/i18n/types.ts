// types.ts

import type { TranslationKeyOf } from "i18n-kit";
import { useTranslation } from ".";
import { dictionary } from "./dictionary";

// 🟩"common.ok" | "common.ng" | "home.hello" | ... のように自動生成される。
export type TranslationKey = TranslationKeyOf<typeof dictionary>;

// useTranslation() や translate が返す「翻訳関数そのものの型」を作って公開する
export type TFunction = ReturnType<typeof useTranslation>;
