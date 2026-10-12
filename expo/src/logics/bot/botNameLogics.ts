// botNameLogics.ts

import { TFunction } from "@/src/i18n/types";

export const nameFormatter = (username: string, t: TFunction) => {
  if (username === "bot1") {
    return t("BotName.bot1");
  } else if (username === "bot2") {
    return t("BotName.bot2");
  } else if (username === "bot3") {
    return t("BotName.bot3");
  } else if (username === "you") {
    return t("common.you");
  } else {
    return username;
  }
};
