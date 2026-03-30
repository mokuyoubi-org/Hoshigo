// ============================================================
// src/providers/IAPProvider.tsx
// ============================================================

import { PLANS } from "@/src/constants/plans";
import { IAPContext } from "@/src/contexts/IAPContext";
import { UidContext } from "@/src/contexts/UserContexts";
import { supabase } from "@/src/services/supabase";
import type {
  ProductSubscriptionAndroid,
  ProductSubscriptionIOS,
  PurchaseIOS,
} from "expo-iap";
import { useIAP } from "expo-iap";
import { router } from "expo-router";
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

type BillingCycle = "monthly" | "yearly";

// プラットフォームに応じて fetchProducts に渡す Product ID を返す
const getProductIds = (): string[] => {
  if (Platform.OS === "ios") {
    return PLANS.flatMap((p) =>
      [p.iosMonthlyProductId, p.iosYearlyProductId].filter(Boolean),
    );
  }
  // android
  return PLANS.map((p) => p.androidProductId).filter(Boolean);
};

export function IAPProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") {
    return (
      <IAPContext.Provider
        value={{
          priceMap: {},
          purchasing: null,
          activePlanId: null,
          loading: false,
          error: null,
          billingCycle: "monthly",
          switchCycle: () => {},
          subscribe: async () => {},
        }}
      >
        {children}
      </IAPContext.Provider>
    );
  }

  return <IAPProviderNative>{children}</IAPProviderNative>;
}

// ============================================================
// Google Play の購入をバックエンドで検証して plan_id を更新する
// ============================================================
async function verifyPlaystorePurchase(
  purchaseToken: string,
  subscriptionId: string,
): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("[IAP] セッションがありません");
      return false;
    }

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-playstore-purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ purchaseToken, subscriptionId }),
      },
    );

    const result = await res.json();
    console.log("[IAP] verify-playstore-purchase レスポンス:", result);

    return result.success === true;
  } catch (e) {
    console.error("[IAP] verify-playstore-purchase エラー:", e);
    return false;
  }
}

// ============================================================
// Apple の購入をバックエンドで検証して plan_id を更新する
// ============================================================
async function verifyApplePurchase(
  originalTransactionId: string,
  productId: string,
): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("[IAP] セッションがありません");
      return false;
    }

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-apple-purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ originalTransactionId, productId }),
      },
    );

    const result = await res.json();
    console.log("[IAP] verify-apple-purchase レスポンス:", result);

    return result.success === true;
  } catch (e) {
    console.error("[IAP] verify-apple-purchase エラー:", e);
    return false;
  }
}

function IAPProviderNative({ children }: { children: ReactNode }) {
  const uid = useContext(UidContext);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        // 1. ストアにトランザクション完了を通知
        await finishTransaction({ purchase, isConsumable: false });

        // 2. バックエンドで購入を検証して plan_id を更新
        if (Platform.OS === "android" && purchase.purchaseToken) {
          const verified = await verifyPlaystorePurchase(
            purchase.purchaseToken,
            purchase.productId,
          );
          if (!verified) {
            console.warn("[IAP] 購入の検証に失敗しました");
            setError(
              "購入の確認に失敗しました。サポートにお問い合わせください",
            );
            return;
          }
        } else if (Platform.OS === "ios") {
          const iosPurchase = purchase as PurchaseIOS;
          const verified = await verifyApplePurchase(
            iosPurchase.originalTransactionIdentifierIOS ??
              iosPurchase.transactionId,
            purchase.productId,
          );
          if (!verified) {
            console.warn("[IAP] 購入の検証に失敗しました");
            setError(
              "購入の確認に失敗しました。サポートにお問い合わせください",
            );
            return;
          }
        }

        setActivePlanId(purchase.productId);
        console.log("[IAP] 購入完了・検証OK:", purchase.productId);
        router.replace("/(subscription)/PaymentSuccess");
      } catch (e) {
        console.error("[IAP] finishTransaction error:", e);
      } finally {
        setPurchasing(null);
      }
    },
    onPurchaseError: (e) => {
      const msg = (e as Error)?.message ?? "";
      if (!msg.toLowerCase().includes("cancel")) {
        setError("購入処理中にエラーが発生しました");
      }
      setPurchasing(null);
    },
  });

  const fetchCurrentProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = getProductIds();
      console.log("[IAP] fetching product ids:", ids);
      await fetchProducts({ skus: ids, type: "subs" });
      console.log("[IAP] subscriptions:", subscriptions);
    } catch (e) {
      console.error("[IAP] fetchProducts error:", e);
      setError("商品情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    if (connected) {
      fetchCurrentProducts();
    }
  }, [connected]);

  const switchCycle = useCallback((cycle: BillingCycle) => {
    setBillingCycle(cycle);
  }, []);

  const subscribe = useCallback(
    async (productId: string, basePlanId: string) => {
      console.log("[IAP] uid at purchase time:", uid);

      try {
        setPurchasing(productId);
        setError(null);

        if (Platform.OS === "android") {
          // Android: offerToken を選択して購入リクエスト
          const subscription = subscriptions.find((s) => s.id === productId);
          const subscriptionOffers =
            subscription?.platform === "android"
              ? (
                  (subscription as ProductSubscriptionAndroid)
                    .subscriptionOfferDetailsAndroid ?? []
                )
                  .filter((offer) => offer.basePlanId === basePlanId)
                  .map((offer) => ({
                    sku: productId,
                    offerToken: offer.offerToken,
                  }))
              : [];

          console.log("[IAP] subscriptionOffers:", subscriptionOffers);

          await requestPurchase({
            request: {
              google: {
                skus: [productId],
                subscriptionOffers,
                obfuscatedAccountId: uid ?? undefined,
              },
            },
            type: "subs",
          });
        } else if (Platform.OS === "ios") {
          // iOS: basePlanId の概念がないためそのまま sku を渡す
          // appAccountToken に uid をセットすることで
          // App Store Server Notifications から uid を復元できる
          await requestPurchase({
            request: {
              apple: {
                sku: productId,
                andDangerouslyFinishTransactionAutomatically: false,
                appAccountToken: uid ?? undefined,
              },
            },
            type: "subs",
          });
        }
      } catch {
        setPurchasing(null);
      }
    },
    [requestPurchase, subscriptions, uid],
  );

  // priceMap: キーは "productId:basePlanId"（Android）または "productId"（iOS）
  const priceMap = Object.fromEntries(
    subscriptions.flatMap((s) => {
      if (s.platform === "android") {
        const android = s as ProductSubscriptionAndroid;
        return (android.subscriptionOfferDetailsAndroid ?? []).map((offer) => [
          `${s.id}:${offer.basePlanId}`,
          offer.pricingPhases.pricingPhaseList.at(-1)?.formattedPrice ?? "",
        ]);
      }
      if (s.platform === "ios") {
        const ios = s as ProductSubscriptionIOS;
        // iOSはproductIdをそのままキーにする
        return [[s.id, ios.displayPrice ?? ""]];
      }
      return [];
    }),
  );

  console.log("[IAP] priceMap:", priceMap);

  return (
    <IAPContext.Provider
      value={{
        priceMap,
        purchasing,
        activePlanId,
        loading: !connected || loading,
        error,
        billingCycle,
        switchCycle,
        subscribe: (productId: string) => {
          if (Platform.OS === "ios") {
            // iOSはbasePlanIdが不要なのでそのまま渡す
            return subscribe(productId, "");
          }
          // Android: billingCycle に応じて basePlanId を決定
          const plan = PLANS.find((p) => p.androidProductId === productId);
          const basePlanId =
            billingCycle === "monthly"
              ? (plan?.androidMonthlyBasePlanId ?? "")
              : (plan?.androidYearlyBasePlanId ?? "");
          return subscribe(productId, basePlanId);
        },
      }}
    >
      {children}
    </IAPContext.Provider>
  );
}
