// src/screens/CustomPaywallScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type {
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "../../src/services/RevenueCat";

interface CustomPaywallScreenProps {
  onDismiss?: () => void;
}

export default function CustomPaywallScreen({
  onDismiss,
}: CustomPaywallScreenProps): React.JSX.Element {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const { refreshStatus } = useRevenueCat();

  useEffect(() => {
    loadOfferings();
  }, []);

  // const loadOfferings = async (): Promise<void> => {
  //   const offering = await getOfferings();
  //   setOfferings(offering);
  //   setLoading(false);
  // };

  const loadOfferings = async (): Promise<void> => {
    console.log("🔍 Loading offerings...");
    const offering = await getOfferings();

    console.log("📦 Raw offering:", JSON.stringify(offering, null, 2));

    if (!offering) {
      console.log("❌ Offering is null!");
      setOfferings(null);
      setLoading(false);
      return;
    }

    console.log("✅ Offering exists");
    console.log(
      "📦 Available packages count:",
      offering.availablePackages?.length,
    );

    if (offering.availablePackages) {
      offering.availablePackages.forEach((pkg, index) => {
        console.log(`📦 Package ${index}:`, {
          identifier: pkg.identifier,
          productIdentifier: pkg.product?.identifier,
          priceString: pkg.product?.priceString,
          title: pkg.product?.title,
        });
      });
    }

    setOfferings(offering);
    setLoading(false);
  };

  const handlePurchase = async (pkg: PurchasesPackage): Promise<void> => {
    setPurchasing(true);
    const result = await purchasePackage(pkg);
    setPurchasing(false);

    if (result.success) {
      await refreshStatus();
      Alert.alert("成功！", "Hoshigo Proへようこそ！");
      onDismiss?.();
    } else if (result.cancelled) {
      // キャンセルされた - 何もしない
    } else {
      Alert.alert("エラー", result.error || "購入に失敗しました");
    }
  };

  const handleRestore = async (): Promise<void> => {
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);

    if (result.success && result.isPro) {
      await refreshStatus();
      Alert.alert("復元成功！", "サブスクリプションが復元されました");
      onDismiss?.();
    } else if (result.success && !result.isPro) {
      Alert.alert("情報", "復元できるサブスクリプションがありませんでした");
    } else {
      Alert.alert("エラー", result.error || "復元に失敗しました");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!offerings) {
    return (
      <View style={styles.container}>
        <Text>商品情報を読み込めませんでした</Text>
      </View>
    );
  }

  // monthly, yearly, lifetimeのパッケージを取得
  // const packages = offerings.availablePackages;
  // const monthly = packages.find(p => p.identifier === 'monthly');
  // const yearly = packages.find(p => p.identifier === 'yearly');
  // const lifetime = packages.find(p => p.identifier === 'lifetime');

  // パッケージ取得（修正版）
  const packages = offerings.availablePackages;

  // product.identifierで検索（package.identifierではなく）
  const monthly = packages.find((p) => p.product.identifier === "monthly");
  const yearly = packages.find((p) => p.product.identifier === "yearly");
  const lifetime = packages.find((p) => p.product.identifier === "lifetime");

  console.log("📦 Found:", {
    monthly: monthly?.identifier,
    yearly: yearly?.identifier,
    lifetime: lifetime?.identifier,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hoshigo Pro</Text>
      <Text style={styles.subtitle}>すべての機能をアンロック</Text>

      <View style={styles.packagesContainer}>
        {/* 月額プラン */}
        {monthly && (
          <TouchableOpacity
            style={styles.packageButton}
            onPress={() => handlePurchase(monthly)}
            disabled={purchasing}
          >
            <Text style={styles.packageTitle}>月額プラン</Text>
            <Text style={styles.packagePrice}>
              {monthly.product.priceString}/月
            </Text>
          </TouchableOpacity>
        )}

        {/* 年額プラン */}
        {yearly && (
          <TouchableOpacity
            style={[styles.packageButton, styles.recommendedPackage]}
            onPress={() => handlePurchase(yearly)}
            disabled={purchasing}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>おすすめ</Text>
            </View>
            <Text style={styles.packageTitle}>年額プラン</Text>
            <Text style={styles.packagePrice}>
              {yearly.product.priceString}/年
            </Text>
            <Text style={styles.savingsText}>月額より20%お得！</Text>
          </TouchableOpacity>
        )}

        {/* 買い切りプラン */}
        {lifetime && (
          <TouchableOpacity
            style={styles.packageButton}
            onPress={() => handlePurchase(lifetime)}
            disabled={purchasing}
          >
            <Text style={styles.packageTitle}>買い切りプラン</Text>
            <Text style={styles.packagePrice}>
              {lifetime.product.priceString}
            </Text>
            <Text style={styles.savingsText}>一度だけのお支払い</Text>
          </TouchableOpacity>
        )}
      </View>

      {purchasing && <ActivityIndicator size="large" style={styles.loader} />}

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={purchasing}
      >
        <Text style={styles.restoreText}>購入を復元</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
        <Text style={styles.closeText}>閉じる</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    marginBottom: 40,
  },
  packagesContainer: {
    gap: 16,
  },
  packageButton: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  recommendedPackage: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f7ff",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 24,
    color: "#007AFF",
    fontWeight: "bold",
  },
  savingsText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  loader: {
    marginTop: 20,
  },
  restoreButton: {
    marginTop: 30,
    padding: 16,
    alignItems: "center",
  },
  restoreText: {
    color: "#007AFF",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 10,
    padding: 16,
    alignItems: "center",
  },
  closeText: {
    color: "#666",
    fontSize: 16,
  },
});
