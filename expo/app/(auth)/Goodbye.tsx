import {
  BACKGROUND,
  CHOCOLATE,
  CHOCOLATE_SUB,
  STRAWBERRY,
} from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GoodbyeScreen() {
  const { t } = useTranslation();
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // プログレスバーアニメーション
    Animated.timing(progress, {
      toValue: 0,
      duration: 5000, // 5秒
      useNativeDriver: false,
    }).start();

    // 自動遷移
    const timer = setTimeout(() => {
      router.replace("/Login");
    }, 5000); // 5秒

    return () => clearTimeout(timer);
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* アイコン */}
        <Image
          source={require("@/assets/images/udon_sleep.png")}
          style={styles.characterImage}
          resizeMode="contain"
        />

        {/* テキスト */}
        <View style={styles.textArea}>
          <Text style={styles.title}>{t("Goodbye.title")}</Text>
          <Text style={styles.message}>{t("Goodbye.message")}</Text>
        </View>

        {/* プログレスバー */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressBar, { width: progressWidth }]}
          />
        </View>
        <Text style={styles.hint}>{t("Goodbye.redirectHint")}</Text>

        {/* ボタン */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => router.replace("/Login")}
        >
          <Text style={styles.buttonText}>{t("common.close")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  characterImage: { width: 80, height: 80, borderRadius: 12 },
  textArea: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: CHOCOLATE_SUB,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(200,214,230,0.4)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: STRAWBERRY,
    borderRadius: 2,
  },
  hint: {
    fontSize: 12,
    color: CHOCOLATE_SUB,
    letterSpacing: 0.3,
  },
  button: {
    height: 54,
    width: "100%",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    marginTop: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
});
