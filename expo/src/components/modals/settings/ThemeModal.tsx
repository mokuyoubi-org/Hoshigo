// ThemeModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors, useThemeMode } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { ThemeMode } from "@/src/types/theme";
import { Feather, FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Divider, ModalShell } from "ui-atoms";

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

export const ThemeModal = ({ onClose }: Props) => {
  const t = useTranslation();
  const colors = useColors();
  const { mode, setMode } = useThemeMode();

  // 「切り替え中」の情報:どの mode に切り替え中か + ボタンを押した時の背景色
  const [pending, setPending] = useState<{
    mode: ThemeMode;
    fromBackground: string;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 背景色がまだ変わっていなければ「切り替え中」、変わったら自動的に null(完了)
  const pendingMode =
    pending && colors.background === pending.fromBackground
      ? pending.mode
      : null;

  // モーダルが閉じられた時のお片付け
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = (nextMode: ThemeMode) => {
    if (nextMode === mode) return;

    setPending({ mode: nextMode, fromBackground: colors.background });

    // 色が変わらなかった場合の保険(タイムアウトで解除)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPending(null);
      timeoutRef.current = null;
    }, PENDING_TIMEOUT_MS);

    setMode(nextMode);
  };

  return (
    <ModalShell
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      onClose={onClose}
      size="md"
      contentPadding={16}
    >
      <MyText className="text-xl text-text text-center pb-4">
        {t("theme.theme")}
      </MyText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {OPTIONS.map((option, index) => {
          const isSelected = mode === option.mode;
          const isPending = pendingMode === option.mode;

          return (
            <React.Fragment key={option.mode}>
              {index > 0 && (
                <Divider backgroundColor={colors.backgroundStrong} />
              )}
              <TouchableOpacity
                className="flex-row justify-between items-center p-4 min-h-12"
                onPress={() => handlePress(option.mode)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <Feather
                    name={option.icon}
                    size={20}
                    color={isSelected ? colors.text : colors.textSub}
                  />
                  <MyText
                    className="text-xl"
                    style={{
                      color: isSelected ? colors.text : colors.textSub,
                    }}
                  >
                    {t(`theme.${option.mode}`)}
                  </MyText>
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
};
