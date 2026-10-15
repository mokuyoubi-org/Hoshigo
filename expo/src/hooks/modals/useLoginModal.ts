// useLoginModal.ts

import { useTranslation } from "@/src/i18n/LangProvider";
import { authClient } from "@/src/services/auth/auth-client";
import { useState } from "react";
import { Platform } from "react-native"; // ← プラットフォームを判定する道具
import { useProfileSync } from "../rpc/useProfileSync";

type Props = {
  onClose: () => void;
};

export const useLoginModal = ({ onClose }: Props) => {
  const t = useTranslation();
  const { syncProfile } = useProfileSync();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Googleでログインする
  const onSignInWithGoogle = async () => {
    setError("");
    setLoading(true);

    try {
      // 📱スマホのときは「hoshigo://」で戻って、💻Webのときは「/」や画面に戻るようにする
      const callbackURL =
        Platform.OS === "web" ? window.location.origin + "/" : "hoshigo://"; // スマホアプリのカスタムスキーム

      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackURL,
      });

      if (signInError) {
        console.error("Googleログイン失敗:", signInError);
        setError(t("LoginModal.errorVerifyFailed"));
        return;
      }

      await syncProfile();
      onClose();
    } catch (err) {
      console.error("Googleログインエラー:", err);
      setError(t("LoginModal.errorVerifyFailed"));
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    error,
    setError,
    loading,
    onSignInWithGoogle,
    onCancel: onClose,
  };
};
