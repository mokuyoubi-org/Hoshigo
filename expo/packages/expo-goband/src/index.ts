// expo-goband/src/index.ts

// 1. 型定義＆定数（これ1行で型も値もぜんぶ export される）
export * from "./types/go";

// 2. 状態管理 Hook
export * from "./hooks/useGoGame";

// 3. UIコンポーネント
export * from "./components/GoBoard";
export * from "./components/ReplayControls";


// 4. 純粋計算・変換ロジック
export * from "./logics/boardConverters";
export * from "./logics/colorConverters";
export * from "./logics/goLogics";
export * from "./logics/moveConverters";
export * from "./logics/okigoLogics";
export * from "./logics/territoryLogics";
export * from "./logics/getColorToMove";


// 5. 終局計算・目算サービス
export * from "./services/goscorer";
