// ThemeModal.tsx
import {
  useColors,
  useThemeMode,
  type ThemeMode,
} from "@/src/active/hooks/useTheme";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { Feather, FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { AppText } from "../common/AppText";
import { Divider } from "../common/Divider";

type Props = {
  onClose: () => void;
};

type Option = {
  mode: ThemeMode;
  icon: keyof typeof Feather.glyphMap;
};

const OPTIONS: Option[] = [
  { mode: "system", icon: "settings" },
  { mode: "light", icon: "sun" },
  { mode: "dark", icon: "moon" },
];

// 色が変わらなかった場合でも、くるくるが永遠に回り続けないための保険(ミリ秒)
const PENDING_TIMEOUT_MS = 3000;

export function ThemeModal({ onClose }: Props) {
  const t = useTranslation();
  const colors = useColors();
  const { mode, setMode } = useThemeMode();

  // 「切り替え中」の mode(なければ null)
  const [pendingMode, setPendingMode] = useState<ThemeMode | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPendingMode(null);
  }, []);

  // 実際に色が変わったら、くるくるを止める
  useEffect(() => {
    clearPending();
  }, [colors.background, clearPending]);

  // モーダルが閉じられた時のお片付け
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = (nextMode: ThemeMode) => {
    if (nextMode === mode) return;

    setPendingMode(nextMode);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(clearPending, PENDING_TIMEOUT_MS);

    setMode(nextMode);
  };

  return (
    <ModalShell
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundDark}
      onClose={onClose}
      size="md"
      contentPadding={16}
    >
      <AppText className="text-xl text-text text-center pb-4">
        {t("theme.theme")}
      </AppText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundDark overflow-hidden">
        {OPTIONS.map((option, index) => {
          const isSelected = mode === option.mode;
          const isPending = pendingMode === option.mode;

          return (
            <React.Fragment key={option.mode}>
              {index > 0 && <Divider />}
              <TouchableOpacity
                className="flex-row justify-between items-center px-4 py-4 min-h-12"
                onPress={() => handlePress(option.mode)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Feather
                    name={option.icon}
                    size={20}
                    color={isSelected ? colors.text : colors.textSub}
                  />
                  <AppText
                    style={{
                      fontSize: 18,
                      color: isSelected ? colors.text : colors.textSub,
                    }}
                  >
                    {t(`theme.${option.mode}`)}
                  </AppText>
                </View>

                {isSelected && (
                  <View className="items-center justify-center">
                    {isPending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <FontAwesome
                        name="check-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </ModalShell>
  );
}
