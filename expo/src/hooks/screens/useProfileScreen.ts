// useProfileScreen.ts

import { useProfile } from "@/src/contexts/ProfileContexts";
import { useTranslation } from "@/src/i18n/LangProvider";
import { isReservedName } from "@/src/logics/format/validationLogics";
import { getRankInfo } from "@/src/logics/rank/rankLogics";
import { api } from "@/src/services/api/api";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import { useState } from "react";

export const useProfileScreen = () => {
  const t = useTranslation();
  const {
    username,
    iconIndex,
    isLoggedIn,
    uid,
    updateProfile,
    rating9,
    rating13,
    rating19,
    isPremium,
  } = useProfile();
  const [rank9, rank13, rank19] = [
    getRankInfo(rating9, t),
    getRankInfo(rating13, t),
    getRankInfo(rating19, t),
  ];

  // 選択中の盤面サイズ（9路 or 13路 or 19路）
  const { value: boardSize, setValue: setBoardSize } = useKVStorage<BoardSize>(
    "ProfileScreen.boardSize", // ユニークなキーを用意する
    9,
  );
  const [loading, setLoading] = useState(false);

  // 盤面サイズに応じて、rankInfo を切り替える
  const currentRankInfo =
    boardSize === 9 ? rank9 : boardSize === 13 ? rank13 : rank19;

  const handleSelectIcon = async (selectedIconIndex: number) => {
    setLoading(true);
    try {
      const { error } = await api.rpc("update_icon_index", {
        new_icon_index: selectedIconIndex,
      });
      if (error) {
        console.error(error);
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
    // ボットの名前などは「すでに使われている」扱いにする(サーバに送る前に弾く)
    if (isReservedName(newUsername)) {
      return t("Profile.usernameTaken");
    }

    setLoading(true);
    try {
      const { error } = await api.rpc("update_username", {
        new_username: newUsername,
      });

      if (error) {
        console.log("API error:", error.code, error.message);

        if (error.code === "USERNAME_TAKEN") {
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
      isLoggedIn,
      uid,
      boardSize,
      rankInfo: currentRankInfo,
      loading,
      isPremium,
    },
    handlers: {
      setBoardSize,
      handleSelectIcon,
      handleUpdateUsername,
    },
  };
};
