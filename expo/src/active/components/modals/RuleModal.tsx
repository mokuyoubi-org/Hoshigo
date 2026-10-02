// RuleModal.tsx
import { useTranslation } from "@/src/active/i18n/LangProvider";
import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";

import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function RuleItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={1}
      className="flex-row mb-5 items-start w-full"
    >
      <View
        // mt-2.5は必要
        className="w-2 h-2 rounded-full mt-2.5 mr-2 bg-text"
      />
      <View className="flex-1">
        <AppText className="text-lg text-text">{title}</AppText>
        <AppText className="text-base leading-6 text-text">
          {description}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

export function RuleModal({ visible, onClose }: Props) {
  const { height: windowHeight } = useWindowDimensions();

  const t = useTranslation();
  const colors = useColors();
  if (!visible) return null;

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View className="w-full pb-3">
        <AppText className="text-xl text-text tracking-wide">
          {t("RuleModal.title")}
        </AppText>
      </View>

      <ScrollView
        style={{
          height: windowHeight * 0.5,
          borderColor: colors.backgroundStrong,
          borderWidth: 2,
          borderRadius: 16,
          padding: 16,
          backgroundColor: colors.foreground,
        }}
        showsVerticalScrollIndicator={false}
      >
        <RuleItem
          title={t("RuleModal.ruleDescription")}
          description={t("RuleModal.objectiveDescription")}
        />
        <RuleItem
          title={t("RuleModal.komiTitle")}
          description={t("RuleModal.komiDescription")}
        />
        <RuleItem
          title={t("RuleModal.timeLimitTitle")}
          description={t("RuleModal.timeLimitDescription")}
        />
      </ScrollView>
    </ModalShell>
  );
}
