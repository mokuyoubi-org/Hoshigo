// src/hooks/useRevenueCat.ts
import { useContext } from "react";
import { CustomerInfo } from "react-native-purchases";
import {
  IsPremiumContext,
  // RevenueCatLoadingContext,
  RefreshRevenueCatContext,
  RevenueCatCustomerInfoContext,
} from "../contexts/UserContexts";

interface UseRevenueCatReturn {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  // loading: boolean;
  refreshStatus: () => Promise<void>;
}

export const useRevenueCat = (): UseRevenueCatReturn => {
  const isPremium = useContext(IsPremiumContext);
  const customerInfo = useContext(RevenueCatCustomerInfoContext);
  // const loading = useContext(RevenueCatLoadingContext);
  const refreshStatus = useContext(RefreshRevenueCatContext);

  // Context内でチェック
  if (refreshStatus === null) {
    throw new Error("useRevenueCat must be used within AppProviders");
  }

  return {
    isPro: isPremium ?? false, // 🔧 nullの場合はfalseにする
    customerInfo,
    // loading,
    refreshStatus,
  };
};
