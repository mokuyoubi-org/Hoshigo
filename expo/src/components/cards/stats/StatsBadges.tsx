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
    wins9,
    wins13,
    wins19,
    giantKillingStreak9,
    giantKillingStreak13,
    giantKillingStreak19,
  } = useProfile();

  const t = useTranslation();
  const colors = useColors();

  const getBoardStats = () => {
    switch (boardSize) {
      case 9:
        return {
          wins: wins9 ?? 0,
          streak: giantKillingStreak9 ?? 0,
        };
      case 13:
        return {
          wins: wins13 ?? 0,
          streak: giantKillingStreak13 ?? 0,
        };
      case 19:
      default:
        return {
          wins: wins19 ?? 0,
          streak: giantKillingStreak19 ?? 0,
        };
    }
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
