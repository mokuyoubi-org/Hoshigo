// useSettingsScreen.ts

import { useMatching } from "@/src/contexts/MatchingContext";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useLang } from "@/src/i18n/LangProvider";
import { api } from "@/src/services/api/api";
import { authClient } from "@/src/services/auth/auth-client";
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

  const { value: isSoundEnabled, setValue: setIsSoundEnabled } =
    useKVStorage<boolean>("global.sound", true);

  const isDisabled = loading || isMatching;

  const onLogout = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        console.error("ログアウト失敗:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);

    try {
      // サーバー側で user を消すと、プロフィール・成績・セッションも芋づる式に消える
      const { error } = await api.rpc("delete_user_account");
      if (error) {
        console.error("アカウント削除失敗:", error);
        return;
      }

      // 手元に残っている「入場券(セッション)」も片づける
      const { error: signOutError } = await authClient.signOut();
      if (signOutError) {
        // サーバー側では、もう入場券ごと消えているので、エラーになっても正常なことがある
        console.log("サインアウト結果:", signOutError.message);
      } else {
        console.log("サインアウト成功！");
      }
    } finally {
      setLoading(false);
    }
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
