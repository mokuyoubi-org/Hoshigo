// ============================================================
// src/contexts/IAPContext.ts
// ============================================================
import React from 'react';

export type IAPContextType = {
  // priceMap のキーは "productId:basePlanId"（例: "hoshigo_plus:monthly-base"）
  priceMap: Record<string, string>;
  purchasing: string | null;
  activePlanId: string | null;
  loading: boolean;
  error: string | null;
  billingCycle: 'monthly' | 'yearly';
  switchCycle: (cycle: 'monthly' | 'yearly') => void;
  // productId だけ渡す（basePlanId は billingCycle から IAPProvider 内で解決）
  subscribe: (productId: string) => Promise<void>;
};

export const IAPContext = React.createContext<IAPContextType>({
  priceMap: {},
  purchasing: null,
  activePlanId: null,
  loading: true,
  error: null,
  billingCycle: 'monthly',
  switchCycle: () => {},
  subscribe: async () => {},
});