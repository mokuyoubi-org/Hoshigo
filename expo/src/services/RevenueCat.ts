// // src/services/RevenueCat.ts
// import Purchases, {
//   LOG_LEVEL,
//   PurchasesOffering,
//   PurchasesPackage,
// } from "react-native-purchases";
// import type {
//   PurchaseResult,
//   RestoreResult,
//   SubscriptionStatus,
// } from "../types/purchases";

// const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!;
// const ENTITLEMENT_ID = "Hoshigo Pro";

// export const initializePurchases = async (): Promise<void> => {
//   try {
//     Purchases.configure({ apiKey: API_KEY });

//     console.log("✅ RevenueCat initialized successfully");

//     // デバッグモード（開発中のみ）
//     if (__DEV__) {
//       Purchases.setLogLevel(LOG_LEVEL.DEBUG);
//     }
//   } catch (error) {
//     console.error("❌ Failed to initialize RevenueCat:", error);
//     throw error;
//   }
// };

// // サブスク状態を確認
// export const checkSubscriptionStatus =
//   async (): Promise<SubscriptionStatus> => {
//     try {
//       const customerInfo = await Purchases.getCustomerInfo();
//       const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;

//       return { isPro, customerInfo };
//     } catch (error) {
//       console.error("❌ Error checking subscription:", error);
//       return { isPro: false, customerInfo: null };
//     }
//   };

// // オファリング（商品一覧）を取得
// export const getOfferings = async (): Promise<PurchasesOffering | null> => {
//   try {
//     const offerings = await Purchases.getOfferings();
//     return offerings.current;
//   } catch (error) {
//     console.error("❌ Error getting offerings:", error);
//     return null;
//   }
// };

// // 購入処理
// export const purchasePackage = async (
//   packageToPurchase: PurchasesPackage,
// ): Promise<PurchaseResult> => {
//   try {
//     const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

//     // 購入成功後、Pro権限があるか確認
//     if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
//       return { success: true, customerInfo };
//     }

//     return { success: false, error: "Entitlement not found" };
//   } catch (error: any) {
//     if (error.userCancelled) {
//       return { success: false, cancelled: true };
//     }

//     console.error("❌ Purchase error:", error);
//     return { success: false, error: error.message };
//   }
// };

// // 復元処理
// export const restorePurchases = async (): Promise<RestoreResult> => {
//   try {
//     const customerInfo = await Purchases.restorePurchases();
//     const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;

//     return { success: true, isPro, customerInfo };
//   } catch (error: any) {
//     console.error("❌ Restore error:", error);
//     return { success: false, error: error.message };
//   }
// };

// // ユーザーをRevenueCatにログイン（SupabaseのUIDと紐付け）
// export const loginRevenueCat = async (uid: string): Promise<void> => {
//   try {
//     const { customerInfo } = await Purchases.logIn(uid);
//     console.log("✅ RevenueCat logged in with uid:", uid);
//     console.log(
//       "📊 isPro after login:",
//       customerInfo.entitlements.active["Hoshigo Pro"] != null,
//     );
//   } catch (error) {
//     console.error("❌ RevenueCat login failed:", error);
//   }
// };

// // ログアウト
// // export const logoutRevenueCat = async (): Promise<void> => {
// //   try {
// //     if (await Purchases.isAnonymous()) {
// //       console.log("⏭️ RevenueCat: anonymous user, skipping logout");
// //       return;
// //     }
// //     await Purchases.logOut();
// //     console.log("✅ RevenueCat logged out");
// //   } catch (error) {
// //     console.error("❌ RevenueCat logout failed:", error);
// //   }
// // };

// export const logoutRevenueCat = async (): Promise<void> => {
//   try {
//     const isAnon = await Purchases.isAnonymous();
//     if (isAnon) {
//       console.log("⏭️ RevenueCat: anonymous user, skipping logout");
//       return;
//     }
//     await Purchases.logOut();
//     console.log("✅ RevenueCat logged out");
//   } catch (error: any) {
//     // 匿名ユーザーのlogoutエラーは無視
//     if (error?.message?.includes("anonymous")) {
//       console.log("⏭️ RevenueCat: already anonymous, skipping");
//       return;
//     }
//     console.error("❌ RevenueCat logout failed:", error);
//   }
// };

import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { SubscriptionStatus } from "../types/purchases";

// Web用は別SDKを動的インポート
let PurchasesJS: any = null;

const getWebSDK = async () => {
  if (!PurchasesJS) {
    const mod = await import("@revenuecat/purchases-js");
    PurchasesJS = mod.Purchases;
  }
  return PurchasesJS;
};

const MOBILE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!;
const WEB_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY!;
const ENTITLEMENT_ID = "Hoshigo Pro";

export const initializePurchases = async (): Promise<void> => {
  if (Platform.OS === "web") {
    // Web初期化はloginRevenueCat時にuidと一緒に行うのでここでは何もしない
    console.log("⏭️ RevenueCat web: will initialize on login");
    return;
  }
  Purchases.configure({ apiKey: MOBILE_API_KEY });
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
};

export const loginRevenueCat = async (uid: string): Promise<void> => {
  if (Platform.OS === "web") {
    const RC = await getWebSDK();
    RC.configure(WEB_API_KEY, uid); // Web SDKはuid必須
    console.log("✅ RevenueCat Web initialized with uid:", uid);
    return;
  }
  try {
    await Purchases.logIn(uid);
    console.log("✅ RevenueCat logged in:", uid);
  } catch (error) {
    console.error("❌ RevenueCat login failed:", error);
  }
};

export const checkSubscriptionStatus =
  async (): Promise<SubscriptionStatus> => {
    try {
      if (Platform.OS === "web") {
        // web
        const RC = await getWebSDK();
        // インスタンスがなければスキップ
        if (!RC.isConfigured()) {
          return { isPro: false, customerInfo: null };
        }
        const instance = RC.getSharedInstance();
        const customerInfo = await instance.getCustomerInfo();
        console.log(
          "🔍 entitlements.active:",
          JSON.stringify(customerInfo.entitlements.active),
        );
        console.log("🔍 ENTITLEMENT_ID:", ENTITLEMENT_ID);
        const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
        console.log("🔍 isPro:", isPro);
        return { isPro, customerInfo };
      }

      // モバイル
      const customerInfo = await Purchases.getCustomerInfo();
      console.log(
        "🔍 entitlements.active:",
        JSON.stringify(customerInfo.entitlements.active),
      );
      console.log("🔍 ENTITLEMENT_ID:", ENTITLEMENT_ID);
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
      console.log("🔍 isPro:", isPro);
      return { isPro, customerInfo };
    } catch (error) {
      console.error("❌ Error checking subscription:", error);
      return { isPro: false, customerInfo: null };
    }
  };

export const logoutRevenueCat = async (): Promise<void> => {
  if (Platform.OS === "web") {
    // Web SDKはlogout不要（configure時にuidを渡す設計のため）
    return;
  }
  try {
    if (await Purchases.isAnonymous()) return;
    await Purchases.logOut();
  } catch (error: any) {
    if (error?.message?.includes("anonymous")) return;
    console.error("❌ RevenueCat logout failed:", error);
  }
};

// オファリング（商品一覧）を取得
export const getOfferings = async (): Promise<any> => {
  try {
    if (Platform.OS === "web") {
      const RC = await getWebSDK();
      const instance = RC.getSharedInstance();
      const offerings = await instance.getOfferings();
      return offerings.current;
    }
    const mod = await import("react-native-purchases");
    const { default: Purchases } = mod;
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error("❌ Error getting offerings:", error);
    return null;
  }
};

// 購入処理
export const purchasePackage = async (pkg: any): Promise<any> => {
  try {
    if (Platform.OS === "web") {
      const RC = await getWebSDK();
      const instance = RC.getSharedInstance();
      await instance.purchase({ rcPackage: pkg });
      // 購入後にcustomerInfoを取得して確認
      const customerInfo = await instance.getCustomerInfo();
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
      return { success: isPro, customerInfo };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      return { success: true, customerInfo };
    }
    return { success: false, error: "Entitlement not found" };
  } catch (error: any) {
    if (error?.userCancelled) return { success: false, cancelled: true };
    console.error("❌ Purchase error:", error);
    return { success: false, error: error.message };
  }
};

// 復元処理
export const restorePurchases = async (): Promise<any> => {
  try {
    if (Platform.OS === "web") {
      const RC = await getWebSDK();
      const instance = RC.getSharedInstance();
      // Web SDKはrestore = customerInfoの再取得
      const customerInfo = await instance.getCustomerInfo();
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
      return { success: true, isPro, customerInfo };
    }
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] != null;
    return { success: true, isPro, customerInfo };
  } catch (error: any) {
    console.error("❌ Restore error:", error);
    return { success: false, error: error.message };
  }
};
