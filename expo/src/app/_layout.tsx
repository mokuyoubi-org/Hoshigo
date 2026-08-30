// app/_layout.tsx

import { SearchingButton } from "@/src/active/components/buttons/SearchingButton";
import { useApp } from "@/src/active/contexts/AppContexts";
import { AuthGate } from "@/src/active/contexts/providers/AuthGate";
import { RootProvider } from "@/src/active/contexts/providers/RootProvider";
import { OverlayProvider } from "react-overlay";
import { KataGoGate } from "expo-katago";
import { Slot } from "expo-router";
import React from "react";
import "../../global.css";

import { COLORS } from "@/src/active/constants/colors";
import { View } from "react-native";
import { MaintenanceModal } from "../active/components/modals/MaintenanceModal";
import { MatchingProvider } from "../active/contexts/providers/MatchingContext";

function RoutedContent() {
  const { isInitializing, maintenance, maintenanceMessage } = useApp();

  return (
    <OverlayProvider>
      <Slot />

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

      {/* 🐱 メンテナンス画面も出現時にふわっと表示！ */}
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
  // AppProvidersにとってのchildrenは、この内側。つまり、AuthGate~RoutedContentの全部。
  // つまり、この内側では
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
