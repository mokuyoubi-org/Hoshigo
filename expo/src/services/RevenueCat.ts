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
