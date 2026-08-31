// ✅active
// useSettingsScreen.ts

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { clearAllLocalData } from "@/src/stable/logics/cleanUp";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { useState } from "react";
import { useMatching } from "../../contexts/providers/MatchingContext";

export function useSettingsScreen() {
  const { isMatching } = useMatching();
  const { email, allowBotMatch, isAnonymous, updateProfile } = useProfile();

  const [loading, setLoading] = useState(false);

  const isDisabled = loading || isMatching;

  const handleToggleBotMatch = async (newValue: boolean) => {
    setLoading(true);
    const { error } = await supabase.rpc("update_allow_bot_match", {
      new_allow_bot_match: newValue,
    });
    if (error) {
      console.error(error);
    } else {
      updateProfile({ allowBotMatch: newValue });
    }
    setLoading(false);
  };

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // ログアウトしたあとにお片付け！
    await clearAllLocalData();
    setLoading(false);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      console.error("アカウント削除失敗:", error);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    // アカウント消したあとにお片付け！
    await clearAllLocalData();
    setLoading(false);
  };

  return {
    email,
    allowBotMatch,
    isAnonymous,
    loading,
    isDisabled,
    isMatching,
    handleToggleBotMatch,
    onLogout,
    handleConfirmDelete,
  };
}
