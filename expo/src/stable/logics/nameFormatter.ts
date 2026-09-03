import { TranslationKey } from "@/src/active/language/lang";

export const botNameFormatter = (
  name: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) => {
  if (name === "bot1") {
    return t("BotName.bot1");
  } else if (name === "bot2") {
    return t("BotName.bot2");
  } else if (name === "bot3") {
    return t("BotName.bot3");
  } else {
    return name;
  }
};
