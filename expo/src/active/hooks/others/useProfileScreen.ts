// ✅active
// useProfileScreen.ts
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useTranslation } from "@/src/active/language/i18n";
import { getRankInfo } from "@/src/stable/logics/rankLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { BoardSize } from "expo-goband";
import { useState } from "react";
import { Alert } from "react-native";

export function useProfileScreen() {
  const t = useTranslation();
  const { username, iconIndex, isAnonymous, updateProfile, points9, points13 } =
    useProfile();
  const [rank9, rank13] = [getRankInfo(points9, t), getRankInfo(points13, t)];

  // 選択中の盤面サイズ（9路 or 13路）
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const [loading, setLoading] = useState(false);

  // 盤面サイズに応じて、rankInfo を切り替える
  const currentRankInfo = boardSize === 9 ? rank9 : rank13;

  const handleSelectIcon = async (selectedIconIndex: number) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("update_icon_index", {
        new_icon_index: selectedIconIndex,
      });
      if (error) {
        console.error(error);
        Alert.alert(t("Profile.iconUpdateFailed"));
      } else {
        updateProfile({ iconIndex: selectedIconIndex });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (
    newUsername: string,
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("update_username", {
        new_username: newUsername,
      });

      if (error) {
        // ざわつきの元だった console.error を消して、普通のログ（log）にする
        console.log("Supabase error:", error.message);

        if (error.message.includes("already taken")) {
          return t("Profile.usernameTaken");
        } else {
          return t("Profile.usernameUpdateFailed");
        }
      } else {
        updateProfile({ username: newUsername });
        return null;
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    profileData: {
      username,
      iconIndex: iconIndex ?? 0,
      isAnonymous,
      boardSize,
      rankInfo: currentRankInfo,
      loading,
    },
    handlers: {
      setBoardSize,
      handleSelectIcon,
      handleUpdateUsername,
    },
  };
}
