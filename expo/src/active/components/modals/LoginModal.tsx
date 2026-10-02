// LoginModal.tsx

import { useLoginModal } from "@/src/active/hooks/useLoginModal";
import { useLang } from "@/src/active/i18n/LangProvider";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { TurnstileHandle, TurnstileWidget } from "turnstile-widget";
import { ModalShell } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { AppTextInput } from "../common/AppTextInput";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LoginModal({ visible, onClose }: Props) {
  const turnstileRef = useRef<TurnstileHandle>(null);
  const { lang } = useLang();
  const colors = useColors();
  const {
    t,
    step,
    email,
    setEmail,
    otp,
    handleOtpChange,
    error,
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
  } = useLoginModal({ onClose, turnstileRef });

  const getTitle = () => {
    if (step === "email") return t("AccountLinking.titleEmail");
    if (step === "otp") return t("AccountLinking.titleOtp");
    if (step === "selection") return t("AccountLinking.selectionTitle");
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
      <TurnstileWidget
        ref={turnstileRef}
        sitekey={process.env.EXPO_PUBLIC_TURNSTILE_SITEKEY!}
        bgColor={colors.background}
        textColor={colors.text}
        spinnerColor={colors.primary}
        spinnerTrackColor={colors.backgroundStrong}
        lang={lang}
      />
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
                  {t("AccountLinking.subtitleEmail")}
                </AppText>
              </View>

              <View className="mb-4">
                <View className="rounded-xl border bg-foreground border-2 border-primaryStrong">
                  <AppTextInput
                    className="h-12 px-4 text-lg text-text"
                    placeholder={"example@email.com"}
                    placeholderTextColor={colors.textOpacity} // 絵文字対策
                    value={email}
                    onChangeText={setEmail}
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
                      {t("AccountLinking.sendCode")}
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
                  {t("AccountLinking.subtitleOtp", { email })}
                </AppText>
              </View>

              <View className="mb-4">
                <AppText className="text-lg mb-1.5 tracking-wide text-text">
                  {t("AccountLinking.otpLabel")}
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
                      {t("AccountLinking.verify")}
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
                className="items-center mt-4"
                onPress={onSendOtp}
                disabled={loading}
              >
                <AppText className="text-lg text-green">
                  {t("AccountLinking.resend")}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {step === "selection" && (
            <View>
              <AppText className="text-lg mb-5 leading-5 tracking-wide text-textSub">
                {t("AccountLinking.selectionMessage")}
              </AppText>

              {!existingPreview || !guestSnapshot ? (
                <View className="py-6 items-center">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity
                    className={`flex-1 rounded-xl p-4 items-center bg-foreground ${
                      selection === "guest"
                        ? "border-2 border-primary"
                        : "border border-backgroundStrong"
                    }`}
                    activeOpacity={0.7}
                    onPress={() => setSelection("guest")}
                    disabled={loading}
                  >
                    <AppText className="text-lg mb-1 tracking-wide text-textSub">
                      {t("AccountLinking.thisDevice")}
                    </AppText>
                    <AppText className="text-lg text-text">
                      {guestSnapshot.username}
                    </AppText>
                    <AppText className="text-lg mt-1 text-textSub">
                      9x9: {guestSnapshot.rating9}pts 13x13:
                      {guestSnapshot.rating13}pts 19x19:
                      {guestSnapshot.rating19}pts
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 rounded-xl p-4 items-center bg-foreground ${
                      selection === "existing"
                        ? "border-2 border-primary"
                        : "border border-backgroundStrong"
                    }`}
                    activeOpacity={0.7}
                    onPress={() => setSelection("existing")}
                    disabled={loading}
                  >
                    <AppText className="text-lg mb-1 tracking-wide text-primary">
                      {t("AccountLinking.savedAccount")}
                    </AppText>
                    <AppText className="text-lg text-text">
                      {existingPreview.username}
                    </AppText>
                    <AppText className="text-lg mt-1 text-textSub">
                      9x9: {existingPreview.rating_9}pts 13x13:
                      {existingPreview.rating_13}pts 19x19:
                      {existingPreview.rating_19}pts
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}

              {error ? (
                <AppText className="text-lg text-center mb-3 text-failure">
                  {error}
                </AppText>
              ) : null}

              <View className="gap-2 mt-2">
                <TouchableOpacity
                  className={`h-12 rounded-xl justify-center items-center ${
                    canConfirmSelection && !loading
                      ? "bg-blackStone"
                      : "bg-backgroundStrong"
                  }`}
                  activeOpacity={0.8}
                  onPress={onConfirmSelection}
                  disabled={loading || !canConfirmSelection}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.foreground} />
                  ) : (
                    <AppText className="text-base tracking-wide text-foreground">
                      {t("AccountLinking.confirmSelection")}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
