// components/modals/settingsScreen/AllowBotMatchModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { api } from "@/src/services/api/api";
import { useState } from "react";
import { View } from "react-native";
import { ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  isMatching?: boolean;
  onClose: () => void;
};

export const AllowBotMatchModal = ({ isMatching, onClose }: Props) => {
  const colors = useColors();
  const t = useTranslation();
  const { allowBotMatch: rawAllowBotMatch, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);

  // null のときは「入(true)」として扱う
  const allowBotMatch = rawAllowBotMatch ?? true;

  const handleToggle = async () => {
    const newValue = !allowBotMatch;
    setLoading(true);
    const { error } = await api.rpc("update_allow_bot_match", {
      new_allow_bot_match: newValue,
    });
    if (error) {
      console.error(error);
    } else {
      updateProfile({ allowBotMatch: newValue });
    }
    setLoading(false);
  };

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      contentPadding={16}
    >
      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">
            {t("Settings.allowBotMatch")}
          </MyText>
          <ToggleSwitch
            value={allowBotMatch}
            onToggle={handleToggle}
            disabled={isMatching || loading}
            backgroundOnColor={colors.primary}
            backgroundOffColor={colors.backgroundStrong}
            toggleColor={colors.foreground}
          />
        </View>
      </View>
    </ModalShell>
  );
};