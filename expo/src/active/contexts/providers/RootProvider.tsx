import { LangProvider } from "@/src/active/language/i18n";
import React, { ReactNode } from "react";
import { AppProvider } from "../AppContexts";
import { ProfileProvider } from "../ProfileContexts";

// ------------------------------------------------------------------ //
// RootProvider
// 責務: 各領域のProviderをまとめてアプリ全体に適用する場所
// ------------------------------------------------------------------ //
// 🟨
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <AppProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </AppProvider>
    </LangProvider>
  );
}
