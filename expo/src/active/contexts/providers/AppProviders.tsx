import React, { ReactNode } from "react";
import { AppProvider } from "../AppContexts";
import { LangProvider } from "../LangContext";
import { ProfileProvider } from "../ProfileContexts";

// ------------------------------------------------------------------ //
// AppProviders
// 責務: 各領域のProviderをまとめてアプリ全体に適用する場所
// ------------------------------------------------------------------ //
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <AppProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </AppProvider>
    </LangProvider>
  );
}
