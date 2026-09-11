// index.ts
import { createI18n } from "i18n-kit";
import { dictionary } from "./dictionary";

export const { LangProvider, useLang, useTranslation, translate } = createI18n(dictionary);


