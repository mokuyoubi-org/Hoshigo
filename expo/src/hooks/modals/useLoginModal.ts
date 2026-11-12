// Hoshigo
// src/hooks/modals/useLoginModal.ts

import { useTranslation } from "@/src/i18n/LangProvider";
import { authClient } from "@/src/services/auth/auth-client";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Platform } from "react-native"; // ← プラットフォームを判定する道具
import { useProfileSync } from "../profile/useProfileSync";

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

      // ここに到達しなかった場合は、Promiseが消えている(アプリが作り直された)
      console.log("🔐 signIn.social が戻ってきた", { hasError: !!signInError });

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

  // Appleでサインインする(iPhone標準のシートを使う)
  const onSignInWithApple = async () => {
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      // ① iPhoneが、Appleから「身分証(IDトークン)」をもらってくる
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        console.error("Appleログイン失敗: identityToken がない");
        setError(t("LoginModal.errorVerifyFailed"));
        return;
      }

      // ② その身分証を、サーバー(Better Auth)に渡してログインする
      const { error: signInError } = await authClient.signIn.social({
        provider: "apple",
        idToken: { token: credential.identityToken },
      });

      if (signInError) {
        console.error("Appleログイン失敗:", signInError);
        setError(t("LoginModal.errorVerifyFailed"));
        return;
      }

      await syncProfile();
      onClose();
    } catch (err) {
      // シートを自分で閉じただけ(キャンセル)のときは、エラーを出さない
      if ((err as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      console.error("Appleログインエラー:", err);
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
    onSignInWithApple,
    onCancel: onClose,
  };
};
