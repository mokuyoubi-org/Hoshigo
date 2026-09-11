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

export const isBot = (username: string) => {
  if (username === "bot1" || username === "bot2" || username === "bot3") {
    return true;
  } else {
    return false;
  }
};
