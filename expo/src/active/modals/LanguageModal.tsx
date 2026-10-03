// LanguageModal.tsx

import {
  useLang,
  useSetLang,
  useTranslation,
} from "@/src/active/i18n/LangProvider";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { AppText } from "../components/common/AppText";
import { Divider } from "../components/common/Divider";
import { useColors } from "./../hooks/useTheme";

type Props = {
  onClose: () => void;
};

type LangCode = "zh" | "ko" | "ja" | "en";

const LANGUAGES: { code: LangCode; labelKey: `language.${LangCode}` }[] = [
  { code: "zh", labelKey: "language.zh" },
  { code: "ko", labelKey: "language.ko" },
  { code: "ja", labelKey: "language.ja" },
  { code: "en", labelKey: "language.en" },
];

export function LanguageModal({ onClose }: Props) {
  const colors = useColors();
  const t = useTranslation();
  const { lang } = useLang();
  const setLang = useSetLang();

  // 🟨選択中の言語が一番上に来るよう並び替え
  const orderedLanguages = [
    ...LANGUAGES.filter((l) => l.code === lang),
    ...LANGUAGES.filter((l) => l.code !== lang),
  ];

  // 中国語か韓国語かどうかのチェック
  const isAiTranslated = lang === "zh" || lang === "ko";

  return (
    <ModalShell
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      onClose={onClose}
      size="md"
      contentPadding={16}
    >
      <AppText className="text-xl color-text text-center pb-4">
        {t("common.language")}
      </AppText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {orderedLanguages.map(({ code, labelKey }, index) => (
          <React.Fragment key={code}>
            <TouchableOpacity
              className="flex-row justify-between items-center px-4 py-3 min-h-12"
              onPress={() => {
                setLang(code);
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <AppText
                  className={`text-lg ${lang === code ? "text-text" : "text-textSub"}`}
                >
                  {t(labelKey)}
                </AppText>
              </View>

              {lang === code && (
                <FontAwesome
                  name="check-circle"
                  size={24}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
            {index < orderedLanguages.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </View>

      {/* 🟨 中国語か韓国語のときだけ注意書きを表示 */}
      {isAiTranslated && (
        <AppText className="text-xs text-textSub text-center px-2">
          {t("LanguageModal.aiNotice")}
        </AppText>
      )}
    </ModalShell>
  );
}
