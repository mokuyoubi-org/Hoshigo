import { TFunction } from "@/src/active/i18n/types";
import { BoardSize } from "go-core";

export const boardSizeToText = (boardSize: BoardSize, t: TFunction) => {
  if (boardSize === 5) return t("common.fiveBoard");
  else if (boardSize === 9) return t("common.nineBoard");
  else if (boardSize === 13) return t("common.thirteenBoard");
  else if (boardSize === 19) return t("common.nineteenBoard");
  else return "";
};

export const boardSizeOptions = (t: TFunction) => {
  return [
    { value: 9 as BoardSize, label: boardSizeToText(9, t) },
    { value: 13 as BoardSize, label: boardSizeToText(13, t) },
    { value: 19 as BoardSize, label: boardSizeToText(19, t) },
  ];
};
