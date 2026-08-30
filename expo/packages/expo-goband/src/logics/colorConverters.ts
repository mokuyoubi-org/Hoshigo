// colorConverters.ts

import { BLACK, Color, WHITE } from "../types/go";

export const colorToString = (color: Color): "black" | "white" =>
  color === BLACK ? "black" : "white";

export const stringToColor = (value: string): Color =>
  value === "black" ? BLACK : WHITE;
