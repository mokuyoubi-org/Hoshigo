// @/app/_layout.tsx
import { Slot } from "expo-router";
import React from "react";
import { AppProviders } from "../src/components/AppProviders";
import "../src/services/i18n"; // 多言語対応にする

// Slotは枠。ここにページ(例えばlogin.tsx)をはめ込むイメージ
export default function Layout() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
