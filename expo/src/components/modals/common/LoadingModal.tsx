// LoadingModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { ActivityIndicator, View } from "react-native";
import { DotAnimation, ModalShell } from "ui-atoms";

type Props = {
  visible?: boolean;
};

export default function LoadingModal({ visible = true }: Props) {
  const colors = useColors();
  const t = useTranslation();

  if (!visible) return null;

  return (
    <ModalShell
      size="sm"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View className="w-48 h-36 justify-center items-center self-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <MyText className="mt-4 text-base text-center text-text">
          <DotAnimation text={t("common.loading")} />
        </MyText>
      </View>
    </ModalShell>
  );
}
