// app/_layout.tsx

import { SearchingButton } from "@/src/active/components/buttons/SearchingButton";
import { useApp } from "@/src/active/contexts/AppContexts";
import { AuthGate } from "@/src/active/contexts/providers/AuthGate";
import { RootProvider } from "@/src/active/contexts/providers/RootProvider";
import { KataGoGate } from "expo-katago";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import "../../global.css";
// import "../active/i18n/polyfills";
import { MaintenanceModal } from "@/src/active/components/modals/MaintenanceModal";
import { UpdateModal } from "@/src/active/components/modals/UpdateModal";
import { FONTS } from "@/src/active/constants/fonts";
import { preloadAssets } from "@/src/active/constants/preload";
import { MatchingProvider } from "@/src/active/contexts/MatchingContext";
import {
  OverlayOutlet,
  OverlayProvider,
} from "@/src/active/contexts/OverlayContext";
import { useLang, useTranslation } from "@/src/active/i18n/LangProvider";
import { configureAudioMode } from "assets-kit";
import { useFonts } from "expo-font";
import { useColorScheme } from "nativewind";
import { Platform, View } from "react-native";
import { LoadingScreen } from "ui-atoms";
import { THEME_VARS } from "../active/constants/themeVars";
import { useAppFont } from "../active/hooks/useAppFont";
import { useApplyTheme, useColors } from "../active/hooks/useTheme";

function RoutedContent() {
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
            label={`${t("auth.checkingAuthentication")}...`}
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
}

function AppContent() {
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
}

export default function Layout() {
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

  // Hookはすべてこの行より上に置くこと(下に置くとクラッシュします)
  if ((!fontsLoaded && !fontError) || !themeReady) {
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
}
