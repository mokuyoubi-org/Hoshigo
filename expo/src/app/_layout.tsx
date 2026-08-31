// app/_layout.tsx

import { SearchingButton } from "@/src/active/components/buttons/SearchingButton";
import { useApp } from "@/src/active/contexts/AppContexts";
import { AuthGate } from "@/src/active/contexts/providers/AuthGate";
import { RootProvider } from "@/src/active/contexts/providers/RootProvider";
import { KataGoGate } from "expo-katago";
import { Stack } from "expo-router";
import React from "react";
import { OverlayProvider } from "react-overlay";
import "../../global.css";

import { COLORS } from "@/src/active/constants/colors";
import { View } from "react-native";
import { MaintenanceModal } from "../active/components/modals/MaintenanceModal";
import { MatchingProvider } from "../active/contexts/providers/MatchingContext";

function RoutedContent() {
  const { isInitializing, maintenance, maintenanceMessage } = useApp();

  return (
    // ここでStackを使うことによって、router.back()が機能する。つまりStackがないということは履歴がないということ
    <OverlayProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* (tabs) グループ自体を1つの画面として登録 */}
        <Stack.Screen name="(tabs)" />
        {/* RecordsScreen / AnalyzeScreen が app/ 直下にあるならここにも明示してOK（省略しても自動登録される） */}
      </Stack>

      <SearchingButton />

      {/* ローディング幕 */}
      {isInitializing && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.background,
            zIndex: 999,
          }}
        />
      )}

      {/* 🐱 メンテナンス画面 */}
      {maintenance && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }}
        >
          <MaintenanceModal message={maintenanceMessage} />
        </View>
      )}
    </OverlayProvider>
  );
}

export default function Layout() {
  return (
    <RootProvider>
      <AuthGate>
        <KataGoGate>
          <MatchingProvider>
            <RoutedContent />
          </MatchingProvider>
        </KataGoGate>
      </AuthGate>
    </RootProvider>
  );
}
