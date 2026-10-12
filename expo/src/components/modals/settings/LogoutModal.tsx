// LogoutModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";

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
      borderColor={colors.backgroundStrong}
    >
      <View className="w-full flex-row justify-between items-center mb-3">
        <MyText className="text-lg flex-1 text-text text-center">
          {t("LogoutModal.title")}
        </MyText>
      </View>

      <View className="w-full gap-2 mt-2">
        <TouchableOpacity
          className={`w-full h-12 rounded-xl justify-center items-center ${
            loading ? "bg-primaryStrong" : "bg-blackStone"
          }`}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <MyText className="text-foreground text-base">
              {t("common.logout")}
            </MyText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className={`w-full h-12 rounded-xl justify-center items-center ${
            loading ? "bg-background" : "bg-backgroundStrong"
          }`}
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.8}
        >
          <MyText
            className={`${
              loading ? "bg-backgroundStrong" : "text-textSub"
            } text-base`}
          >
            {t("common.cancel")}
          </MyText>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};
