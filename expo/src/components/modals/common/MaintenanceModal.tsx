// MaintenanceModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { View } from "react-native";
import { ModalShell } from "ui-atoms";

export const MaintenanceModal = ({ message }: { message: string | null }) => {
  const t = useTranslation();
  const colors = useColors();
  const hasMessage = message && message.trim() !== "";
  return (
    <ModalShell
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <MyText className="text-base color-text text-center">
        {t("MaintenanceModal.defaultMessage")}
      </MyText>
      {hasMessage && (
        <View className="bg-foreground rounded-xl mt-4 p-4 w-full border-2 border-backgroundStrong">
          <MyText className="text-base color-text text-center">
            {message}
          </MyText>
        </View>
      )}
    </ModalShell>
  );
};
