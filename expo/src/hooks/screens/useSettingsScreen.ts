// useSettingsScreen.ts

import { useMatching } from "@/src/contexts/MatchingContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useLang } from "@/src/i18n/LangProvider";
import { supabase } from "@/src/services/supabase/supabase";
import { useKVStorage } from "kv-store";
import { useState } from "react";

export const useSettingsScreen = () => {
  const { isMatching } = useMatching();
  const {
    email,
    allowBotMatch9,
    allowBotMatch13,
    allowBotMatch19,
    isAnonymous,
  } = useProfile();

  const { lang } = useLang();

  const [loading, setLoading] = useState(false);

  const {
    value: isSoundEnabled,
    setValue: setIsSoundEnabled,
  } = useKVStorage<boolean>("global.sound", true);

  const isDisabled = loading || isMatching;

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
    allowBotMatch9,
    allowBotMatch13,
    allowBotMatch19,
    isAnonymous,
    loading,
    isDisabled,
    isMatching,
    onLogout,
    handleConfirmDelete,
    lang,
    isSoundEnabled,
    setIsSoundEnabled,
  };
};
