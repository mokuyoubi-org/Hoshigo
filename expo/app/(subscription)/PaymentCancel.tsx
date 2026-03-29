// ============================================================
// screens/PaymentCancelScreen.tsx
// 支払いキャンセルページ（hoshigo.app/cancel へのルート）
// ============================================================

import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentCancelScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const goHome = () => {
    router.replace("/(tabs)/Home");
  };
  const goSubscription = () => {
    router.replace("/(subscription)/Subscription");
  };
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* アイコン */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>×</Text>
        </View>

        {/* テキスト */}
        <Text style={styles.heading}>購入がキャンセルされました</Text>
        <Text style={styles.sub}>
          決済は完了していません。{"\n"}
          いつでもプランに登録できます。
        </Text>

        {/* ボタン */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goSubscription}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>プランを見る</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={goHome}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>ホームへ戻る</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  icon: { color: "#888", fontSize: 40, fontWeight: "300" },

  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 24,
  },

  buttons: { marginTop: 40, width: "100%", gap: 12 },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  secondaryButtonText: { color: "#888", fontSize: 16, fontWeight: "500" },
});
