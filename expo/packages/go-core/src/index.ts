// expo-goband/src/index.ts

// 1. 型定義＆定数（これ1行で型も値もぜんぶ export される）
export * from "./types/go";
export * from "./types/analysis";

// 4. 純粋計算・変換ロジック
export * from "./logics/boardConverters";
export * from "./logics/colorConverters";
export * from "./logics/getColorToMove";
export * from "./logics/goLogics";
export * from "./logics/moveConverters";
export * from "./logics/okigoLogics";
export * from "./logics/territoryLogics";

// 5. 終局計算・目算サービス
export * from "./goscorer/goscorer";
