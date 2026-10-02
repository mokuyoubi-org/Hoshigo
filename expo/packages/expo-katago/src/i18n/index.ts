// expo-katago/src/i18n/index.ts

import { createI18n } from "i18n-kit";
import { kataGoDictionary } from "./dictionary";

export const { translate } = createI18n(kataGoDictionary);