// src/active/i18n/index.ts

import { createI18n } from "i18n-kit";
import { dictionary } from "./dictionary";

export const { translate } = createI18n(dictionary);
