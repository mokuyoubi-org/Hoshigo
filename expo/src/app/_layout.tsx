// app/_layout.tsx

import { SearchingButton } from "@/src/components/buttons/SearchingButton";
import { MaintenanceModal } from "@/src/components/modals/common/MaintenanceModal";
import { UpdateModal } from "@/src/components/modals/common/UpdateModal";
import { FONTS } from "@/src/constants/fonts";
import { preloadAssets } from "@/src/constants/preload";
import { THEME_VARS } from "@/src/constants/themeVars";
import { useApp } from "@/src/contexts/AppContexts";
import { AuthGate } from "@/src/contexts/AuthGate";
import { MatchingProvider } from "@/src/contexts/MatchingContext";
import { OverlayOutlet, OverlayProvider } from "@/src/contexts/OverlayContext";
import { RootProvider } from "@/src/contexts/RootProvider";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useApplyTheme, useColors } from "@/src/hooks/common/useTheme";
import { useLang, useTranslation } from "@/src/i18n/LangProvider";
import { configureAudioMode } from "assets-kit";
import { useFonts } from "expo-font";
import { KataGoGate } from "expo-katago";
import { SplashScreen, Stack } from "expo-router"; // 🆕 SplashScreenを追加
import { kvStore } from "kv-store"; // 🆕 パッケージ名は実際のものに合わせてください
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react"; // 🆕 useStateを追加
import { Platform, View } from "react-native";
import { DotAnimation, LoadingScreen } from "ui-atoms";
import "@/global.css";

// 🆕 準備ができるまで、スプラッシュ画面を出したままにする
SplashScreen.preventAutoHideAsync();

const RoutedContent = () => {
  const fontFamily = useAppFont();
  const colors = useColors();

  const t = useTranslation();
  const { isInitializing, maintenance, maintenanceMessage, updateReason } =
    useApp();

  // updateReasonとPlatform.OSから、出すべきモーダルの種類を決める。
  // web: appでもotaでも「リロードして」の一種類
  // native: app不足→ストア誘導、ota不足→再起動誘導
  const modalKind =
    updateReason === null
      ? null
      : Platform.OS === "web"
        ? ("reload" as const)
        : updateReason === "app"
          ? ("store" as const)
          : ("restart" as const);

  useEffect(() => {
    // 効果音がBGMを中断しないようにする設定。
    configureAudioMode();

    // 起動直後にバックグラウンドで画像/音声を先読みしておく。
    // 失敗しても致命的ではないので、エラーは握りつぶして良い。
    preloadAssets().catch((error) => {
      console.warn("Failed to preload assets:", error);
    });
  }, []);

  return (
    // ここでStackを使うことによって、router.back()が機能する。つまりStackがないということは履歴がないということ
    // ここは<View>にしてはいけない
    <>
      {/* 今表示中のオーバーレイ(モーダル)をここで実際に描画する。
          MatchingProviderの内側にあるので、GameResultModal等はuseMatching()を使える */}
      <OverlayOutlet />

      {/* ToastはModalより手前に出したいので、Outletより後ろに置く(nativeは兄弟の描画順も効く) */}
      <SearchingButton />

      <Stack screenOptions={{ headerShown: false }}>
        {/* (tabs) グループ自体を1つの画面として登録 */}
        <Stack.Screen name="(tabs)" />
        {/* RecordsScreen / AnalyzeScreen が app/ 直下にあるならここにも明示してOK（省略しても自動登録される） */}
      </Stack>

      {/* ローディング */}
      {isInitializing && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 300,
          }}
        >
          {/* AuthGate.tsx の initialize() が待ち先。セッション確認〜匿名ログイン
        〜プロフィール同期までを一括してこの1状態で表現している(子段階なし) */}
          <LoadingScreen
            label={<DotAnimation text={t("auth.checkingAuthentication")} />}
            percent={null}
            backgroundColor={colors.background}
            textColor={colors.textSub}
            trackColor={colors.backgroundStrong}
            fillColor={colors.primary}
            fontFamily={fontFamily}
          />
        </View>
      )}

      {/* 🐱 メンテナンス画面 */}
      {maintenance && !modalKind && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 301,
          }}
        >
          <MaintenanceModal message={maintenanceMessage} />
        </View>
      )}

      {/* 🐱 強制アップデート画面(メンテより優先度を高くする) */}
      {modalKind && !isInitializing && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 302,
          }}
        >
          <UpdateModal kind={modalKind} />
        </View>
      )}
    </>
  );
};

const AppContent = () => {
  const fontFamily = useAppFont();
  const colors = useColors();

  const { lang } = useLang();
  return (
    <AuthGate>
      <OverlayProvider>
        <KataGoGate
          backgroundColor={colors.background}
          textColor={colors.textSub}
          fillColor={colors.primary}
          trackColor={colors.backgroundStrong}
          errorColor={colors.failure}
          lang={lang}
          fontFamily={fontFamily}
        >
          <MatchingProvider>
            <RoutedContent />
          </MatchingProvider>
        </KataGoGate>
      </OverlayProvider>
    </AuthGate>
  );
};

// 🆕 今までの Layout の中身。名前だけ LayoutContent に変わった
const LayoutContent = () => {
  // 🔤 アプリ全体のフォントは、起動時にここで1回だけ読み込む
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

  // 🆕 フォントとテーマの準備ができたか
  const isReady = (fontsLoaded || !!fontError) && themeReady;

  // 🆕 準備ができたら、スプラッシュ画面を閉じる
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

// 🆕 kvStoreの準備(引き出し → 机の上への書き写し)を待つだけの親。
//    LayoutContent以下は、すべて準備完了後に動き出すので、
//    どこでkvStore.get / useKVStorageを使ってもloadingは要らない
export default function Layout() {
  const [kvReady, setKvReady] = useState(false);

  useEffect(() => {
    kvStore.init().finally(() => setKvReady(true));
  }, []);

  if (!kvReady) {
    return null;
  }

  return <LayoutContent />;
}
