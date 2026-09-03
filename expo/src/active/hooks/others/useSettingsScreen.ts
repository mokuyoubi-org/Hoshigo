// ✅active
// useSettingsScreen.ts

import { useProfile } from "@/src/active/contexts/ProfileContexts";
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
    // サインアウトの結果を受け取る
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (signOutError) {
      console.error("サインアウト失敗:", signOutError.message);
    } else {
      console.log("サインアウト成功！");
    }

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
