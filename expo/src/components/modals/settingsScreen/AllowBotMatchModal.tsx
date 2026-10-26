// AllowBotMatchModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { api } from "@/src/services/api/api";
import { useState } from "react";
import { View } from "react-native";
import { Divider, ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  isMatching?: boolean;
  onClose: () => void;
};

export const AllowBotMatchModal = ({ isMatching, onClose }: Props) => {
  const colors = useColors();
  const t = useTranslation();
  const { stats, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);

  // null のときは「入(true)」として扱う(サーバー側の COALESCE(..., true) と同じ決め方)
  const botMatch9 = stats[9].allowBotMatch ?? true;
  const botMatch13 = stats[13].allowBotMatch ?? true;
  const botMatch19 = stats[19].allowBotMatch ?? true;

  const handleToggleBotMatch = async (
    boardSize: 9 | 13 | 19,
    newValue: boolean,
  ) => {
    setLoading(true);
    const { error } = await api.rpc("update_allow_bot_match", {
      p_board_size: boardSize,
      new_allow_bot_match: newValue,
    });
    if (error) {
      console.error(error);
    } else {
      // 例: boardSize が 13 なら、引き出しの名前は "allowBotMatch13"
      const key = `allowBotMatch${boardSize}` as const;
      updateProfile({ [key]: newValue });
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
      <MyText className="text-xl text-text text-center pb-4">
        {t("Settings.allowBotMatch")}
      </MyText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {/* 9路 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">{t("common.nineBoard")}</MyText>
          {
            <ToggleSwitch
              value={botMatch9}
              onToggle={() => handleToggleBotMatch(9, !botMatch9)}
              disabled={isMatching || loading}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          }
        </View>

        <Divider backgroundColor={colors.backgroundStrong} />

        {/* 13路 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">
            {t("common.thirteenBoard")}
          </MyText>
          {
            <ToggleSwitch
              value={botMatch13}
              onToggle={() => handleToggleBotMatch(13, !botMatch13)}
              disabled={isMatching || loading}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          }
        </View>

        <Divider backgroundColor={colors.backgroundStrong} />

        {/* 19路 */}
        <View className="flex-row justify-between items-center p-4 min-h-12">
          <MyText className="text-xl text-text">
            {t("common.nineteenBoard")}
          </MyText>
          {
            <ToggleSwitch
              value={botMatch19}
              onToggle={() => handleToggleBotMatch(19, !botMatch19)}
              disabled={isMatching || loading}
              backgroundOnColor={colors.primary}
              backgroundOffColor={colors.backgroundStrong}
              toggleColor={colors.foreground}
            />
          }
        </View>
      </View>
    </ModalShell>
  );
};
