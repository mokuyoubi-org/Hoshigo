// RuleModal.tsx
import { useTranslation } from "@/src/active/language/i18n";
import { ModalShell } from "modal-shell";
import React from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

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
      <View className="w-2.5 h-2.5 rounded-full mt-1.5 mr-3.5 bg-text" />
      <View className="flex-1">
        <Text className="text-base font-bold mb-1.5 text-text">{title}</Text>
        <Text className="text-[15px] leading-6 text-text">{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function RuleModal({ visible, onClose }: Props) {
  const { height: windowHeight } = useWindowDimensions();

  const t = useTranslation();

  if (!visible) return null;

  return (
    <ModalShell onClose={onClose} size="lg">
      <View className="w-full pb-3">
        <Text className="text-xl font-bold text-text tracking-wide">
          {t("InfoModal.title")}
        </Text>
      </View>

      <ScrollView
        style={{ height: windowHeight * 0.5 }}
        showsVerticalScrollIndicator={false}
      >
        <RuleItem
          title={t("InfoModal.ruleTitle")}
          description={t("InfoModal.ruleDescription")}
        />
        <RuleItem
          title={t("InfoModal.boardTitle")}
          description={t("InfoModal.boardDescription")}
        />
        <RuleItem
          title={t("InfoModal.komiTitle")}
          description={t("InfoModal.komiDescription")}
        />
        <RuleItem
          title={t("InfoModal.timeLimitTitle")}
          description={t("InfoModal.timeLimitDescription")}
        />
        <RuleItem
          title={t("InfoModal.objectiveTitle")}
          description={t("InfoModal.objectiveDescription")}
        />
      </ScrollView>
    </ModalShell>
  );
}
