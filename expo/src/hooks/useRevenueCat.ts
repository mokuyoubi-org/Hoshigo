// src/hooks/useRevenueCat.ts
import {
  IsPremiumContext,
  RefreshRevenueCatContext,
  RevenueCatCustomerInfoContext,
} from "@/src/contexts/UserContexts";
import { useContext } from "react";
import { CustomerInfo } from "react-native-purchases";

interface UseRevenueCatReturn {
  isPremium: boolean;
  revenueCatCustomerInfo: CustomerInfo | null;
  refreshStatus: () => Promise<void>;
}

export const useRevenueCat = (): UseRevenueCatReturn => {
  const { isPremium, setIsPremium } = useContext(IsPremiumContext)!;
  const { revenueCatCustomerInfo } = useContext(RevenueCatCustomerInfoContext)!;
  const refreshStatus = useContext(RefreshRevenueCatContext);

  // Context内でチェック
  if (refreshStatus === null) {
    throw new Error("useRevenueCat must be used within AppProviders");
  }

  return {
    isPremium: isPremium ?? false, // 🔧 nullの場合はfalseにする
    revenueCatCustomerInfo,
    refreshStatus,
  };
};
