// app/_layout.tsx

import { SearchingButton } from "@/src/active/components/buttons/SearchingButton";
import { useApp } from "@/src/active/contexts/AppContexts";
import { AuthGate } from "@/src/active/contexts/providers/AuthGate";
import { RootProvider } from "@/src/active/contexts/providers/RootProvider";
import { KataGoGate } from "expo-katago";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import "../../global.css";

import { MaintenanceModal } from "@/src/active/components/modals/MaintenanceModal";
import { UpdateModal } from "@/src/active/components/modals/UpdateModal";
import { COLORS } from "@/src/active/constants/colors";
import { preloadAssets } from "@/src/active/constants/preload";
import { OverlayProvider } from "@/src/active/contexts/OverlayContext";
import { MatchingProvider } from "@/src/active/contexts/providers/MatchingContext";
import { Platform, View } from "react-native";
import { configureAudioMode } from "sound-kit";
import { LoadingScreen } from "ui-atoms";

function RoutedContent() {
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
    <OverlayProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* (tabs) グループ自体を1つの画面として登録 */}
        <Stack.Screen name="(tabs)" />
        {/* RecordsScreen / AnalyzeScreen が app/ 直下にあるならここにも明示してOK（省略しても自動登録される） */}
      </Stack>

      <SearchingButton />

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
            label="Checking authentication..."
            percent={null}
            backgroundColor={COLORS.background}
            textColor={COLORS.textSub}
            trackColor={COLORS.backgroundDark}
            fillColor={COLORS.primary}
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
    </OverlayProvider>
  );
}

export default function Layout() {
  return (
    <RootProvider>
      <AuthGate>
        <KataGoGate
          backgroundColor={COLORS.background}
          textColor={COLORS.textSub}
          fillColor={COLORS.primary}
          trackColor={COLORS.backgroundDark}
          errorColor={COLORS.coral}
        >
          <MatchingProvider>
            <RoutedContent />
          </MatchingProvider>
        </KataGoGate>
      </AuthGate>
    </RootProvider>
  );
}
