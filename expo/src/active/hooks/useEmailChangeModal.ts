// useEmailChangeModal.ts
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { isValidEmail } from "@/src/stable/logics/validationLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { useEffect, useState } from "react";
import { useProfileSync } from "./useProfileSync";

export type Step = "email" | "otp";

type Props = {
  onClose: () => void;
};

export function useEmailChangeModal({ onClose }: Props) {
  const t = useTranslation();
  const { syncProfile } = useProfileSync();

  const [step, setStep] = useState<Step>("email");
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSendEmail = isValidEmail(newEmail) && newEmail !== currentEmail;
  const canVerifyOtp = otp.length === 8;

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentEmail(data.user?.email ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ステップ1: 新しいメアドへ確認コードを送信
  const onSendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        console.error("メアド変更リクエスト失敗:", updateError);
        setError(t("EmailChange.errorSendFailed"));
        return;
      }

      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  // ステップ2: OTP検証
  const onVerifyOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: otp,
        type: "email_change",
      });

      if (verifyError) {
        console.error("verifyOtp失敗:", verifyError);
        setError(t("EmailChange.errorVerifyFailed"));
        return;
      }

      await syncProfile();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string) => {
    setOtp(text.replace(/[^0-9]/g, "").slice(0, 8)); // この8はotpの8なので注意
  };

  return {
    t,
    step,
    newEmail,
    setNewEmail,
    otp,
    handleOtpChange,
    error,
    loading,
    canSendEmail,
    canVerifyOtp,
    onSendOtp,
    onVerifyOtp,
  };
}
