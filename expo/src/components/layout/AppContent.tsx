// src/components/layout/AppContent.tsx

import { RoutedContent } from "@/src/components/layout/RoutedContent";
import { AuthGate } from "@/src/contexts/AuthGate";
import { MatchingProvider } from "@/src/contexts/MatchingContext";
import { OverlayProvider } from "@/src/contexts/OverlayContext";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useLang } from "@/src/i18n/LangProvider";
import { KataGoGate } from "expo-katago";

export const AppContent = () => {
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
};