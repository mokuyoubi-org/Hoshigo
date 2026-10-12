// EmailChangeModal.tsx
// 2026/09/24⚠️大事: supabaseで、Authentication▶︎Sign In/Providers▶︎Auth Providers▶︎Email(Enabled)▶︎Secure email changeをオフにすること。

import { MixedTextInput } from "@/src/components/common/MixedTextInput";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useEmailChangeModal } from "@/src/hooks/modals/useEmailChangeModal";
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

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const EmailChangeModal = ({ visible, onClose }: Props) => {
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
          <MyText className="text-2xl tracking-wider flex-1 text-text">
            {getTitle()}
          </MyText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === "email" && (
            <View>
              <View className="mb-6">
                <MyText className="text-lg tracking-wide text-textSub">
                  {t("EmailChange.subtitleEmail")}
                </MyText>
              </View>

              <View className="mb-4">
                <MyText className="text-lg mb-1.5 tracking-wide text-text">
                  {t("EmailChange.newEmail")}
                </MyText>
                <View className="rounded-xl border border-2 bg-foreground border-primaryStrong">
                  <MixedTextInput
                    className="h-14 px-4 text-xl text-text"
                    placeholder={"example@email.com"}
                    placeholderTextColor={colors.textOpacity} // 絵文字対策
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    editable={!loading}
                    style={{ includeFontPadding: false }} // ⚠️Android用。大事
                  />
                </View>
              </View>

              {error ? (
                <MyText className="text-lg text-center mb-3 text-failure">
                  {error}
                </MyText>
              ) : null}

              <View className="gap-2 mt-2">
                <TouchableOpacity
                  className={`h-14 rounded-xl justify-center items-center ${
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
                    <MyText className="text-lg tracking-wide text-foreground">
                      {t("EmailChange.sendCode")}
                    </MyText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-14 rounded-xl justify-center items-center bg-backgroundStrong"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <MyText className="text-lg tracking-wide text-textSub">
                    {t("common.cancel")}
                  </MyText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === "otp" && (
            <View>
              <View className="mb-6">
                <MyText className="text-lg tracking-wide text-textSub">
                  {t("EmailChange.subtitleOtp", { email: newEmail })}
                </MyText>
              </View>

              <View className="mb-4">
                <MyText className="text-lg mb-1.5 tracking-wide text-text">
                  {t("EmailChange.otpLabel")}
                </MyText>
                <View className="rounded-xl border bg-foreground border-2 border-primaryStrong">
                  <MixedTextInput
                    className="h-12 px-4 text-2xl text-center text-text"
                    placeholder={"12345678"}
                    placeholderTextColor={colors.textOpacity} // 絵文字対策
                    value={otp}
                    onChangeText={handleOtpChange}
                    keyboardType="number-pad"
                    autoFocus
                    editable={!loading}
                    style={{ includeFontPadding: false }} // ⚠️Android用。大事
                  />
                </View>
              </View>

              {error ? (
                <MyText className="text-lg text-center mb-3 text-failure">
                  {error}
                </MyText>
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
                    <MyText
                      numberOfLines={1}
                      className="text-lg tracking-wide text-foreground"
                    >
                      {t("EmailChange.verify")}
                    </MyText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-12 rounded-xl justify-center items-center bg-backgroundStrong"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <MyText className="text-lg tracking-wide text-textSub">
                    {t("common.cancel")}
                  </MyText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="mt-3 items-center py-2"
                onPress={onSendOtp}
                disabled={loading}
              >
                <MyText className="text-lg text-green">
                  {t("AccountLinking.resend")}
                </MyText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
};
