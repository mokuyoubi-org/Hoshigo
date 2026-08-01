// @/src/app/_layout.tsx

import { SearchingButton } from "@/src/active/components/buttons/SearchingButton";
import { MatchingProvider } from "@/src/active/contexts/MatchingContext";
import { AppProviders } from "@/src/active/contexts/providers/AppProviders";
import { AuthGate } from "@/src/active/contexts/providers/AuthGate";
import { KataGoGate } from "@/src/active/contexts/providers/KataGoGate";
import { Slot } from "expo-router";
import React from "react";

export default function Layout() {
  return (
    <AppProviders>
      <AuthGate>
        <KataGoGate>
          <MatchingProvider>
            <Slot />
            <SearchingButton />
          </MatchingProvider>
        </KataGoGate>
      </AuthGate>
    </AppProviders>
  );
}
