// StatsBadges.tsx

import { BoardSize } from "@/packages/go-core/src";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
import { View } from "react-native";
import { Badge } from "./Badge";

type Props = {
  boardSize: BoardSize;
};

export const StatsBadges = ({ boardSize }: Props) => {
  const {
  stats
  } = useProfile();

  const t = useTranslation();
  const colors = useColors();

const getBoardStats = () => {
    const key = (boardSize === 9 || boardSize === 13) ? boardSize : 19;
    const target = stats[key];

    return {
      wins: target?.wins ?? 0,
      streak: target?.giantKillingStreak ?? 0,
    };
  };

  const board = getBoardStats();
  const hasStreak = board.streak >= 2;

  return (
    <View className="flex-row flex-wrap gap-2">
      {/* 勝利数 */}
      <Badge
        icon={<FontAwesome5 name="trophy" size={16} color={colors.gold} />}
        value={board.wins}
        label={t("Stats.wins")}
      />

      {/* 連勝ボーナス */}
      {hasStreak && (
        <Badge
          icon={<AntDesign name="fire" size={18} color={colors.rose} />}
          value={`×${board.streak}`}
          label={t("Stats.streakBonus")}
        />
      )}
    </View>
  );
};
