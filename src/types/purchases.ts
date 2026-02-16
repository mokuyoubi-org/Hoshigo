// src/types/purchases.ts
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

export interface SubscriptionStatus {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  cancelled?: boolean;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  isPro?: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}