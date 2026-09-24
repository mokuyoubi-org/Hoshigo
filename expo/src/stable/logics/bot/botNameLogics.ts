// botNameLogics.ts

import { TFunction } from "@/src/active/i18n/types";

export const botNameFormatter = (username: string, t: TFunction) => {
  if (username === "bot1") {
    return t("BotName.bot1");
  } else if (username === "bot2") {
    return t("BotName.bot2");
  } else if (username === "bot3") {
    return t("BotName.bot3");
  } else {
    return username;
  }
};

