// RootProvider.tsx


import { LangSync } from "@/src/active/i18n/LangSync";
import React, { ReactNode } from "react";
import { AppProvider } from "../AppContexts";
import { ProfileProvider } from "../ProfileContexts";
import { LangProvider } from "../../i18n/LangProvider";

// ------------------------------------------------------------------ //
// RootProvider
// 責務: 各領域のProviderをまとめてアプリ全体に適用する場所
// ------------------------------------------------------------------ //
// 🟨
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <LangSync />
      <AppProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </AppProvider>
    </LangProvider>
  );
}