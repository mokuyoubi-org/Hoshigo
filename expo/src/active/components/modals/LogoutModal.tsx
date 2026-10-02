// LogoutModal.tsx

import { useTranslation } from "@/src/active/i18n/LangProvider";
import React, { useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";

type Props = {
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export const LogoutModal = ({ onConfirm, onCancel }: Props) => {
  const t = useTranslation();
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      onClose={onCancel}
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundDark}
    >
      <View className="w-full flex-row justify-between items-center mb-3">
        <AppText className="text-lg flex-1 text-text text-center">
          {t("LogoutModal.title")}
        </AppText>
      </View>

      <View className="w-full gap-2 mt-2">
        <TouchableOpacity
          className={`w-full h-12 rounded-xl justify-center items-center ${
            loading ? "bg-primaryDark" : "bg-blackStone"
          }`}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <AppText className="text-foreground text-base">
              {t("common.logout")}
            </AppText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className={`w-full h-12 rounded-xl justify-center items-center ${
            loading ? "bg-background" : "bg-backgroundDark"
          }`}
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.8}
        >
          <AppText
            className={`${
              loading ? "bg-backgroundDark" : "text-textSub"
            } text-base`}
          >
            {t("common.cancel")}
          </AppText>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};
