// RuleModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import React from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { BotHandicapTable } from "../../rule/BotHandicapTable";
import { RuleItem } from "../../rule/RuleItem";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const RuleModal = ({ visible, onClose }: Props) => {
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
        <MyText className="text-xl text-text tracking-wide">
          {t("RuleModal.title")}
        </MyText>
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
        {/* 基本ルール説明 */}
        <RuleItem
          title={t("RuleModal.ruleDescription")}
          description={t("RuleModal.objectiveDescription")}
        />

        {/* 持ち時間 */}
        <RuleItem
          title={t("RuleModal.timeLimitTitle")}
          description={t("RuleModal.timeLimitDescription")}
        />

        {/* マッチング(対人) */}
        <RuleItem
          title={t("RuleModal.matchingTitle")}
          sections={[
            {
              subtitle: t("RuleModal.pvpRatingTitle"),
              description: t("RuleModal.pvpRatingDescription"),
            },
            {
              subtitle: t("RuleModal.winStreakTitle"),
              description: t("RuleModal.winStreakDescription"),
            },
            {
              subtitle: t("RuleModal.botMatchTitle"),
              description: t("RuleModal.botMatchDescription"),
            },
          ]}
        >
          <BotHandicapTable />
        </RuleItem>
      </ScrollView>
    </ModalShell>
  );
};
