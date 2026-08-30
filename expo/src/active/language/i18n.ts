// src/active/i18n.ts
import { createI18n } from "i18n-kit";
import { dictionary } from "./dictionary";

export const { LangProvider, useLang, useTranslation } = createI18n(dictionary);
