// app/_layout.tsx

import "@/global.css";
import { AppContent } from "@/src/components/layout/AppContent";
import { FONTS } from "@/src/constants/fonts";
import { THEME_VARS } from "@/src/constants/themeVars";
import { RootProvider } from "@/src/contexts/RootProvider";
import { useApplyTheme } from "@/src/hooks/common/useTheme";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { kvStore } from "kv-store";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { LogBox, View } from "react-native";
import { initRevenueCat } from "../services/revenuecat";

// 準備ができるまで、スプラッシュ画面を出したままにする
SplashScreen.preventAutoHideAsync();
// nativewind系の、うるさいログ黙らせる
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

// 今までの Layout の中身。名前だけ LayoutContent に変わった
const LayoutContent = () => {
  // アプリ全体のフォントは、起動時にここで1回だけ読み込む
  const [fontsLoaded, fontError] = useFonts(FONTS); // ⚠️大事！！！

  // 🌙 保存されたテーマ設定をNativeWindに反映する(1回だけここで)
  const themeReady = useApplyTheme();
  const { colorScheme } = useColorScheme();

  // 読み込みに失敗しても、真っ白のまま止まらないようにログだけ出して先へ進む
  useEffect(() => {
    if (fontError) {
      console.warn("Failed to load fonts:", fontError);
    }
  }, [fontError]);

  // フォントとテーマの準備ができたか
  const isReady = (fontsLoaded || !!fontError) && themeReady;

  // 準備ができたら、スプラッシュ画面を閉じる
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Hookはすべてこの行より上に置くこと(下に置くとクラッシュします)
  if (!isReady) {
    return null;
  }

  return (
    <View
      style={THEME_VARS[colorScheme ?? "light"]}
      className="flex-1 bg-background"
    >
      <RootProvider>
        <AppContent />
      </RootProvider>
    </View>
  );
};

// kvStoreの準備(引き出し → 机の上への書き写し)を待つだけの親。
//    LayoutContent以下は、すべて準備完了後に動き出すので、
//    どこでkvStore.get / useKVStorageを使ってもloadingは要らない
export default function Layout() {
  const [kvReady, setKvReady] = useState(false);

  useEffect(() => {
    initRevenueCat(); // Revenue Catの初期化🐱
    kvStore.init().finally(() => setKvReady(true));
  }, []);

  if (!kvReady) {
    return null;
  }

  return <LayoutContent />;
}