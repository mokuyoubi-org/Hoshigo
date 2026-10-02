// EmailChangeModal.tsx
// 2026/09/24⚠️大事: supabaseで、Authentication▶︎Sign In/Providers▶︎Auth Providers▶︎Email(Enabled)▶︎Secure email changeをオフにすること。

import { useEmailChangeModal } from "@/src/active/hooks/useEmailChangeModal";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { AppTextInput } from "../common/AppTextInput";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function EmailChangeModal({ visible, onClose }: Props) {
  const colors = useColors();
  const {
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
  } = useEmailChangeModal({ onClose });

  const getTitle = () => {
    if (step === "email") return t("EmailChange.titleEmail");
    if (step === "otp") return t("EmailChange.titleOtp");
    return "";
  };

  if (!visible) return null;

  return (
    <ModalShell
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full"
      >
        <View className="flex-row justify-between items-center mb-4">
          <AppText className="text-2xl tracking-wider flex-1 text-text">
            {getTitle()}
          </AppText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === "email" && (
            <View>
              <View className="mb-6">
                <AppText className="text-lg tracking-wide text-textSub">
                  {t("EmailChange.subtitleEmail")}
                </AppText>
              </View>

              <View className="mb-4">
                <AppText className="text-lg mb-1.5 tracking-wide text-text">
                  {t("EmailChange.newEmail")}
                </AppText>
                <View className="rounded-xl border border-2 bg-foreground border-primaryStrong">
                  <AppTextInput
                    className="h-12 px-4 text-lg text-text"
                    placeholder={"example@email.com"}
                    placeholderTextColor={colors.textOpacity} // 絵文字対策
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    editable={!loading}
                  />
                </View>
              </View>

              {error ? (
                <AppText className="text-lg text-center mb-3 text-failure">
                  {error}
                </AppText>
              ) : null}

              <View className="gap-2 mt-2">
                <TouchableOpacity
                  className={`h-12 rounded-xl justify-center items-center ${
                    !canSendEmail || loading
                      ? "bg-primaryStrong"
                      : "bg-blackStone"
                  }`}
                  activeOpacity={0.8}
                  onPress={onSendOtp}
                  disabled={loading || !canSendEmail}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.foreground} />
                  ) : (
                    <AppText className="text-lg tracking-wide text-foreground">
                      {t("EmailChange.sendCode")}
                    </AppText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-12 rounded-xl justify-center items-center bg-backgroundStrong"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <AppText className="text-lg tracking-wide text-textSub">
                    {t("common.cancel")}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === "otp" && (
            <View>
              <View className="mb-6">
                <AppText className="text-lg tracking-wide text-textSub">
                  {t("EmailChange.subtitleOtp", { email: newEmail })}
                </AppText>
              </View>

              <View className="mb-4">
                <AppText className="text-lg mb-1.5 tracking-wide text-text">
                  {t("EmailChange.otpLabel")}
                </AppText>
                <View className="rounded-xl border bg-foreground border-2 border-primaryStrong">
                  <AppTextInput
                    className="h-12 px-4 text-2xl text-center text-text"
                    placeholder={"12345678"}
                    placeholderTextColor={colors.textOpacity} // 絵文字対策
                    value={otp}
                    onChangeText={handleOtpChange}
                    keyboardType="number-pad"
                    autoFocus
                    editable={!loading}
                  />
                </View>
              </View>

              {error ? (
                <AppText className="text-lg text-center mb-3 text-failure">
                  {error}
                </AppText>
              ) : null}

              <View className="gap-2 mt-2">
                <TouchableOpacity
                  className={`h-12 rounded-xl justify-center items-center ${
                    !canVerifyOtp || loading
                      ? "bg-primaryStrong"
                      : "bg-blackStone"
                  }`}
                  activeOpacity={0.8}
                  onPress={onVerifyOtp}
                  disabled={loading || !canVerifyOtp}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.foreground} />
                  ) : (
                    <AppText
                      numberOfLines={1}
                      className="text-lg tracking-wide text-foreground"
                    >
                      {t("EmailChange.verify")}
                    </AppText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-12 rounded-xl justify-center items-center bg-backgroundStrong"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <AppText className="text-lg tracking-wide text-textSub">
                    {t("common.cancel")}
                  </AppText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="mt-3 items-center py-2"
                onPress={onSendOtp}
                disabled={loading}
              >
                <AppText className="text-lg text-green">
                  {t("AccountLinking.resend")}
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
