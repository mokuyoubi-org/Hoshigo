// ============================================================
// src/providers/IAPProvider.tsx
// useIAP をルートレベルで保持するプロバイダー
// uid を obfuscatedAccountId に埋め込んで Google Play に渡す
// ============================================================

import React, { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useIAP } from 'expo-iap';
import type { ProductSubscriptionAndroid } from 'expo-iap';
import { IAPContext } from '@/src/contexts/IAPContext';
import { UidContext } from '@/src/contexts/UserContexts';
import { PLANS } from '@/src/constants/plans';

type BillingCycle = 'monthly' | 'yearly';

const getSkus = (cycle: BillingCycle): string[] =>
  PLANS
    .map((p) => (cycle === 'monthly' ? p.androidMonthlyId : p.androidYearlyId))
    .filter(Boolean);

export function IAPProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <IAPContext.Provider value={{
        priceMap: {},
        purchasing: null,
        activePlanId: null,
        loading: false,
        error: null,
        billingCycle: 'monthly',
        switchCycle: () => {},
        subscribe: async () => {},
      }}>
        {children}
      </IAPContext.Provider>
    );
  }

  return <IAPProviderNative>{children}</IAPProviderNative>;
}

function IAPProviderNative({ children }: { children: ReactNode }) {
  const uid = useContext(UidContext); // Supabase の uid
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
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
        await finishTransaction({ purchase, isConsumable: false });
        setActivePlanId(purchase.productId);
        // plan_id の更新は Google Play Webhook（google-play-webhook）が行う
      } catch (e) {
        console.error('[IAP] finishTransaction error:', e);
      } finally {
        setPurchasing(null);
      }
    },
    onPurchaseError: (e) => {
      const msg = (e as Error)?.message ?? '';
      if (!msg.toLowerCase().includes('cancel')) {
        setError('購入処理中にエラーが発生しました');
      }
      setPurchasing(null);
    },
  });

const fetchCurrentProducts = useCallback(async (cycle: BillingCycle) => {
  setLoading(true);
  setError(null);
  try {
    console.log('[IAP] fetching skus:', getSkus(cycle));
    await fetchProducts({ skus: getSkus(cycle), type: 'subs' });
    console.log('[IAP] subscriptions count:', subscriptions.length);
    console.log('[IAP] subscriptions detail:', JSON.stringify(subscriptions, null, 2));
  } catch (e) {
    console.error('[IAP] fetchProducts error:', e);
    setError('商品情報の取得に失敗しました');
  } finally {
    setLoading(false);
  }
}, [fetchProducts]);



useEffect(() => {
  console.log('[IAP] subscriptions changed:', subscriptions.length);
  console.log('[IAP] subscriptions detail:', JSON.stringify(subscriptions, null, 2));
}, [subscriptions]);




  useEffect(() => {
    if (connected) {
      fetchCurrentProducts(billingCycle);
    }
  }, [connected]);

  const switchCycle = useCallback((cycle: BillingCycle) => {
    setBillingCycle(cycle);
    if (connected) {
      fetchCurrentProducts(cycle);
    }
  }, [connected, fetchCurrentProducts]);

  const subscribe = useCallback(async (productId: string) => {
    try {
      setPurchasing(productId);
      setError(null);

      const subscription = subscriptions.find((s) => s.id === productId);
      const subscriptionOffers =
        subscription?.platform === 'android'
          ? ((subscription as ProductSubscriptionAndroid).subscriptionOfferDetailsAndroid ?? []).map(
              (offer) => ({ sku: productId, offerToken: offer.offerToken }),
            )
          : [];

      await requestPurchase({
        request: {
          apple: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
          google: {
            skus: [productId],
            subscriptionOffers,
            // uid を埋め込む → Google Play Webhook で取り出して DB を更新する
            obfuscatedAccountId: uid ?? undefined,
          },
        },
        type: 'subs',
      });
    } catch {
      setPurchasing(null);
    }
  }, [requestPurchase, subscriptions, uid]);

  const priceMap = Object.fromEntries(
    subscriptions.map((s) => [s.id, s.displayPrice])
  );

  return (
    <IAPContext.Provider value={{
      priceMap,
      purchasing,
      activePlanId,
      loading: !connected || loading,
      error,
      billingCycle,
      switchCycle,
      subscribe,
    }}>
      {children}
    </IAPContext.Provider>
  );
}