// ============================================================
// src/providers/IAPProvider.tsx
// ============================================================

import React, { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useIAP } from 'expo-iap';
import type { ProductSubscriptionAndroid } from 'expo-iap';
import { IAPContext } from '@/src/contexts/IAPContext';
import { UidContext } from '@/src/contexts/UserContexts';
import { PLANS } from '@/src/constants/plans';

type BillingCycle = 'monthly' | 'yearly';

// fetchProducts に渡すのは Product ID だけ（basePlanId は不要）
const getProductIds = (): string[] =>
  PLANS.map((p) => p.androidProductId).filter(Boolean);

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
  const uid = useContext(UidContext);
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

  const fetchCurrentProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = getProductIds();
      console.log('[IAP] fetching product ids:', ids);
      await fetchProducts({ skus: ids, type: 'subs' });
      console.log('[IAP] subscriptions:', subscriptions);
    } catch (e) {
      console.error('[IAP] fetchProducts error:', e);
      setError('商品情報の取得に失敗しました');
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

  const subscribe = useCallback(async (productId: string, basePlanId: string) => {
    try {
      setPurchasing(productId);
      setError(null);

      // productId に一致するサブスク商品を取得
      const subscription = subscriptions.find((s) => s.id === productId);

      // basePlanId に一致する offerToken を選択
      const subscriptionOffers =
        subscription?.platform === 'android'
          ? ((subscription as ProductSubscriptionAndroid).subscriptionOfferDetailsAndroid ?? [])
              .filter((offer) => offer.basePlanId === basePlanId)
              .map((offer) => ({ sku: productId, offerToken: offer.offerToken }))
          : [];

      console.log('[IAP] subscriptionOffers:', subscriptionOffers);

      await requestPurchase({
        request: {
          apple: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
          google: {
            skus: [productId],
            subscriptionOffers,
            obfuscatedAccountId: uid ?? undefined,
          },
        },
        type: 'subs',
      });
    } catch {
      setPurchasing(null);
    }
  }, [requestPurchase, subscriptions, uid]);

  // displayPrice を月払い・年払いそれぞれで priceMap に入れる
  // キーは "productId:basePlanId" 形式
  const priceMap = Object.fromEntries(
    subscriptions.flatMap((s) => {
      if (s.platform !== 'android') return [];
      const android = s as ProductSubscriptionAndroid;
      return (android.subscriptionOfferDetailsAndroid ?? []).map((offer) => [
        `${s.id}:${offer.basePlanId}`,
        // pricingPhases の最後のフェーズが通常価格
        offer.pricingPhases.pricingPhaseList.at(-1)?.formattedPrice ?? '',
      ]);
    })
  );

  console.log('[IAP] priceMap:', priceMap);

  return (
    <IAPContext.Provider value={{
      priceMap,
      purchasing,
      activePlanId,
      loading: !connected || loading,
      error,
      billingCycle,
      switchCycle,
      subscribe: (productId: string) => {
        // billingCycle に応じて basePlanId を決定
        const plan = PLANS.find((p) => p.androidProductId === productId);
        const basePlanId = billingCycle === 'monthly'
          ? plan?.androidMonthlyBasePlanId ?? ''
          : plan?.androidYearlyBasePlanId ?? '';
        return subscribe(productId, basePlanId);
      },
    }}>
      {children}
    </IAPContext.Provider>
  );
}