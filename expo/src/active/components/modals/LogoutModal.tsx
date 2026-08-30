// LogoutModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
import { ModalShell } from "modal-shell";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

type Props = {
  title: string;
  confirmText: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export const LogoutModal = ({
  title,
  confirmText,
  onConfirm,
  onCancel,
}: Props) => {
  const t = useTranslation();
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
    <ModalShell onClose={onCancel} size="lg">
      <View className="w-full flex-row justify-between items-center mb-3">
        <Text className="text-[18px] font-bold flex-1 text-text text-center">
          {title}
        </Text>
      </View>

      <View className="w-full gap-[10px] mt-2">
        <TouchableOpacity
          className="w-full h-[48px] rounded-[12px] justify-center items-center bg-primaryDark"
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.foreground} />
          ) : (
            <Text className="text-foreground text-[16px] font-bold">
              {confirmText}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full h-[48px] rounded-[12px] justify-center items-center bg-backgroundDark"
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text className="text-textSub text-[16px] font-bold">
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};
