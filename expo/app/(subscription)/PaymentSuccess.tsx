// ============================================================
// screens/PaymentSuccessScreen.tsx
// 支払い完了ページ（hoshigo.app/success へのルート）
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

export default function PaymentSuccessScreen() {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const goHome = () => {
    router.replace("/(tabs)/Home");
  };

  useEffect(() => {
    // チェックマークをポップイン → テキストをフェードイン
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* チェックマークアイコン */}
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.icon}>✓</Text>
        </Animated.View>

        {/* テキスト */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>ありがとうございます！</Text>
          <Text style={styles.sub}>
            サブスクリプションが有効になりました。{"\n"}
            Hoshigo をお楽しみください 🌟
          </Text>
        </Animated.View>

        {/* ホームへ戻るボタン */}
        <Animated.View style={[styles.buttonWrap, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={goHome}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>ホームへ戻る</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  icon: { color: "#fff", fontSize: 36, fontWeight: "700" },

  heading: {
    fontSize: 26,
    fontWeight: "800",
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

  buttonWrap: { marginTop: 40, width: "100%" },
  button: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
