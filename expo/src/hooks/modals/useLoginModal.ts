// useLoginModal.ts
import { useTranslation } from "@/src/i18n/LangProvider";
import { isValidEmail } from "@/src/logics/format/validationLogics";
import { authClient } from "@/src/services/auth/auth-client";
import { useState } from "react";
import { TurnstileHandle } from "turnstile-widget";
import { useProfileSync } from "../rpc/useProfileSync";

export type Step = "email" | "otp";

type Props = {
  onClose: () => void;
  turnstileRef?: React.RefObject<TurnstileHandle | null>;
};

export const useLoginModal = ({ onClose, turnstileRef }: Props) => {
  const t = useTranslation();
  const { syncProfile } = useProfileSync();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSendEmail = isValidEmail(email);
  const canVerifyOtp = otp.length === 6;

  // ステップ1: メールにコードを送る
  const onSendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      let captchaToken: string | undefined;
      try {
        captchaToken = await turnstileRef?.current?.getToken();
      } catch (err) {
        console.error("CAPTCHAトークン取得失敗:", err);
        setError(t("AccountLinking.errorSendFailed"));
        return;
      }

      const { error: sendError } =
        await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "sign-in",
          fetchOptions: {
            // ロボットではない証明書(Turnstile)は、このヘッダーで渡す
            headers: { "x-captcha-response": captchaToken ?? "" },
          },
        });

      if (sendError) {
        console.error("OTP送信失敗:", sendError);
        setError(t("AccountLinking.errorSendFailed"));
        return;
      }

      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  // ステップ2: コードを確かめてログインする
  const onVerifyOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (verifyError) {
        console.error("OTP検証失敗:", verifyError);
        setError(t("AccountLinking.errorVerifyFailed"));
        return;
      }

      await syncProfile();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string) => {
    setOtp(text.replace(/[^0-9]/g, "").slice(0, 6));
  };

  return {
    t,
    step,
    setStep,
    email,
    setEmail,
    otp,
    handleOtpChange,
    error,
    setError,
    loading,
    canSendEmail,
    canVerifyOtp,
    onSendOtp,
    onVerifyOtp,
    onCancel: onClose,
  };
};