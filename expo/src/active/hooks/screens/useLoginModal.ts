// ✅active
// useLoginModal.ts
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useTranslation } from "@/src/active/language/i18n";
import { clearAllLocalData } from "@/src/stable/logics/cleanUp";
import { isValidEmail } from "@/src/stable/logics/validationLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import React, { useEffect, useState } from "react";
import { TurnstileHandle } from "turnstile-widget";
import { useProfileSync } from "./useProfileSync";

export type Step = "email" | "otp" | "selection";
type Path = "link" | "signin" | null;

export type ExistingPreview = {
  username: string;
  rating_9: number;
  rating_13: number;
} | null;

type GuestSnapshot = {
  username: string;
  rating9: number;
  rating13: number;
};

export type Selection = "guest" | "existing" | null;

type Props = {
  onClose: () => void;
  turnstileRef?: React.RefObject<TurnstileHandle | null>; // ← | null を追加
};

export function useLoginModal({ onClose, turnstileRef }: Props) {
  const t = useTranslation();
  const { username, rating9, rating13 } = useProfile();
  const { syncProfile } = useProfileSync();

  const [step, setStep] = useState<Step>("email");
  const [path, setPath] = useState<Path>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [guestUid, setGuestUid] = useState<string | undefined>(undefined);
  const [guestSnapshot] = useState<GuestSnapshot>(() => ({
    username: username ?? "",
    rating9: rating9 ?? 0,
    rating13: rating13 ?? 0,
  }));
  const [existingPreview, setExistingPreview] = useState<ExistingPreview>(null);
  const [selection, setSelection] = useState<Selection>(null);

  const canSendEmail = isValidEmail(email);
  const canVerifyOtp = otp.length === 8;
  const canConfirmSelection = selection !== null;

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setGuestUid(data.session?.user.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ステップ1: メールを送信する
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

      const { error: updateError } = await supabase.auth.updateUser(
        { email },
        {
          emailRedirectTo: `${process.env.EXPO_PUBLIC_SCHEME!}://`,
        },
      );

      if (!updateError) {
        setPath("link");
        setStep("otp");
        return;
      }

      if (updateError.code === "email_exists") {
        console.log("updateError:", JSON.stringify(updateError, null, 2));
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${process.env.EXPO_PUBLIC_SCHEME!}://`,
            captchaToken,
          },
        });

        if (signInError) {
          console.error("OTP送信失敗:", signInError);
          setError(t("AccountLinking.errorSendFailed"));
          return;
        }

        setPath("signin");
        setStep("otp");
        return;
      }

      setError(t("AccountLinking.errorSendFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ステップ2: OTP検証
  const onVerifyOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const type = path === "link" ? "email_change" : "email";
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type,
      });

      if (verifyError) {
        console.error("verifyOtp失敗:", verifyError);
        setError(t("AccountLinking.errorVerifyFailed"));
        return;
      }

      if (path === "link") {
        await syncProfile();
        onClose();
        return;
      }

      const { data: preview, error: previewError } = await supabase.rpc(
        "get_own_profile_preview",
      );

      if (previewError || !preview) {
        console.error("プレビュー取得失敗:", previewError);
        setError(t("AccountLinking.errorVerifyFailed"));
        return;
      }

      setExistingPreview(preview);
      setStep("selection");
    } finally {
      setLoading(false);
    }
  };

  // ステップ3: 選択決定(signinパスのみ)
  const onConfirmSelection = async () => {
    if (!selection) return;

    setError("");
    setLoading(true);

    try {
      if (selection === "guest") {
        if (!guestUid) {
          setError(t("AccountLinking.errorVerifyFailed"));
          return;
        }
        const { error: overwriteError } = await supabase.rpc(
          "overwrite_profile_from_guest",
          { p_guest_uid: guestUid },
        );

        if (overwriteError) {
          console.error("上書き失敗:", overwriteError);
          setError(t("AccountLinking.errorVerifyFailed"));
          return;
        }
      }

      await clearAllLocalData(); // セッション切れの時
      await syncProfile();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string) => {
    setOtp(text.replace(/[^0-9]/g, "").slice(0, 8));
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
    guestSnapshot,
    existingPreview,
    selection,
    setSelection,
    canSendEmail,
    canVerifyOtp,
    canConfirmSelection,
    onSendOtp,
    onVerifyOtp,
    onConfirmSelection,
    onCancel: onClose,
  };
}
