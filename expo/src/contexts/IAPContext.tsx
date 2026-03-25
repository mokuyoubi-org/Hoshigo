// ============================================================
// src/contexts/IAPContext.ts
// ============================================================

import React from "react";

// 型定義
export type IAPContextType = {
  priceMap: Record<string, string>; // 商品ID -> 表示価格 のマップ（例: 'hoshigo_plus': '¥320'）
  purchasing: string | null; // 今まさに購入フロー中の商品ID（例: 'hoshigo_plus'）
  activePlanId: string | null; // 現在アクティブなプランの商品ID（例: 'hoshigo_plus'）
  loading: boolean; // 読み込み中
  error: string | null; // エラー文を入れるstring
  billingCycle: "monthly" | "yearly"; // 'monthly' か 'yearly'か
  switchCycle: (cycle: "monthly" | "yearly") => void; // 支払いサイクルを切り替える関数（例: 'monthly' → 'yearly'）
  subscribe: (productId: string) => Promise<void>; // 購入処理を実行する関数
};

// Context
export const IAPContext = React.createContext<IAPContextType>({
  // 初期値（まだ何も読み込んでない状態）
  priceMap: {},
  purchasing: null,
  activePlanId: null,
  loading: true, // 初期値true
  error: null,
  billingCycle: "monthly", // デフォルトは月額
  switchCycle: () => {}, // あとで実装
  subscribe: async () => {}, // あとで実装
});
