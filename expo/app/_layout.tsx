import { AppProviders } from "@/src/providers/AppProviders";
import { Slot } from "expo-router";
import React from "react";

export default function Layout() {
  return (
    <AppProviders>
      {/* 画面本体 */}
      <Slot />

    </AppProviders>
  );
}
