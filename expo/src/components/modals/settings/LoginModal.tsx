// LoginModal.tsx

import { MixedText } from "@/src/components/common/MixedText";
import { MixedTextInput } from "@/src/components/common/MixedTextInput";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useLoginModal } from "@/src/hooks/modals/useLoginModal";
import { useLang } from "@/src/i18n/LangProvider";
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

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const LoginModal = ({ visible, onClose }: Props) => {
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
                  {t("AccountLinking.subtitleEmail")}
                </MyText>
              </View>

              <View className="mb-4">
                <View className="rounded-xl border bg-foreground border-2 border-primaryStrong">
                  <MixedTextInput
                    className="h-14 px-4 text-xl text-text"
                    placeholder={"example@email.com"}
                    placeholderTextColor={colors.textOpacity} // 絵文字対策
                    value={email}
                    onChangeText={setEmail}
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
                      {t("AccountLinking.sendCode")}
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
                  {t("AccountLinking.subtitleOtp", { email })}
                </MyText>
              </View>

              <View className="mb-4">
                <MyText className="text-lg mb-1.5 tracking-wide text-text">
                  {t("AccountLinking.otpLabel")}
                </MyText>
                <View className="rounded-xl border bg-foreground border-2 border-primaryStrong">
                  <MixedTextInput
                    className="h-14 px-4 text-xl text-center text-text"
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
                      {t("AccountLinking.verify")}
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
                className="items-center mt-4"
                onPress={onSendOtp}
                disabled={loading}
              >
                <MyText className="text-lg text-green">
                  {t("AccountLinking.resend")}
                </MyText>
              </TouchableOpacity>
            </View>
          )}

          {step === "selection" && (
            <View>
              <MyText className="text-lg mb-5 leading-5 tracking-wide text-textSub">
                {t("AccountLinking.selectionMessage")}
              </MyText>

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
                    <MyText className="text-lg mb-1 tracking-wide text-textSub">
                      {t("AccountLinking.thisDevice")}
                    </MyText>
                    <MixedText className="text-lg text-text">
                      {guestSnapshot.username}
                    </MixedText>
                    <MyText className="text-lg mt-1 text-textSub">
                      9x9: {guestSnapshot.rating9}pts 13x13:
                      {guestSnapshot.rating13}pts 19x19:
                      {guestSnapshot.rating19}pts
                    </MyText>
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
                    <MyText className="text-lg mb-1 tracking-wide text-primary">
                      {t("AccountLinking.savedAccount")}
                    </MyText>
                    <MixedText className="text-lg text-text">
                      {existingPreview.username}
                    </MixedText>
                    <MyText className="text-lg mt-1 text-textSub">
                      9x9: {existingPreview.rating_9}pts 13x13:
                      {existingPreview.rating_13}pts 19x19:
                      {existingPreview.rating_19}pts
                    </MyText>
                  </TouchableOpacity>
                </View>
              )}

              {error ? (
                <MyText className="text-lg text-center mb-3 text-failure">
                  {error}
                </MyText>
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
                    <MyText className="text-base tracking-wide text-foreground">
                      {t("AccountLinking.confirmSelection")}
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
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
};
