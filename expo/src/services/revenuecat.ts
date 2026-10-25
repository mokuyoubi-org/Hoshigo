// services/revenuecat.ts

import { Linking, Platform } from "react-native";
import Purchases from "react-native-purchases";

export const initRevenueCat = () => {
  const apiKey =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
        : Platform.OS === "web"
          ? process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY
          : undefined;

  // ios / android / web 以外は、何もしない
  if (
    Platform.OS !== "ios" &&
    Platform.OS !== "android" &&
    Platform.OS !== "web"
  )
    return;

  if (!apiKey) {
    console.warn("RevenueCatのAPIキーが設定されていません");
    return;
  }

  Purchases.configure({ apiKey });
};

// ログインしたとき:RevenueCatに「この人です」と教える
export const loginRevenueCat = async (userId: string) => {
  if (
    Platform.OS !== "ios" &&
    Platform.OS !== "android" &&
    Platform.OS !== "web"
  )
    return;
  await Purchases.logIn(userId);
};

// Web版:購入ページ(Web Purchase Link)を、ユーザーIDつきで開く
export const openWebPurchase = async (userId: string) => {
  const baseUrl = process.env.EXPO_PUBLIC_REVENUECAT_WEB_PURCHASE_URL;
  if (!baseUrl) {
    console.warn("Web購入ページのURLが設定されていません");
    return;
  }
  await Linking.openURL(`${baseUrl}/${encodeURIComponent(userId)}`);
};
