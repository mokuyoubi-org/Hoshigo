// LoginModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { ModalShell } from "modal-shell";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TurnstileHandle, TurnstileWidget } from "../../TurnstileWidget";
import { useLoginModal } from "../../hooks/others/useLoginModal";

type Props = {
  visible: boolean;
  onClose: () => void;
}

export function LoginModal({ visible, onClose }: Props) {
  const turnstileRef = useRef<TurnstileHandle>(null);

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
    <ModalShell size="lg">
      <TurnstileWidget
        ref={turnstileRef}
        sitekey={process.env.EXPO_PUBLIC_TURNSTILE_SITEKEY!}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full"
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-extrabold tracking-wider flex-1 text-text">
            {getTitle()}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === "email" && (
            <>
              <View className="mb-6">
                <Text className="text-sm font-normal tracking-wide text-textSub">
                  {t("AccountLinking.subtitleEmail")}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold mb-1.5 tracking-wide text-text">
                  {t("common.email")}
                </Text>
                <View className="rounded-xl border bg-foreground border-primary">
                  <TextInput
                    className="h-[50px] px-4 text-base text-text"
                    placeholder={"example@email.com"}
                    placeholderTextColor={COLORS.textSub}
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
                <Text className="text-sm text-center mb-3 text-coral">
                  {error}
                </Text>
              ) : null}

              <View className="gap-[10px] mt-2">
                <TouchableOpacity
                  className={`h-[52px] rounded-xl justify-center items-center bg-darkObject ${
                    !canSendEmail || loading ? "opacity-50" : "opacity-100"
                  }`}
                  activeOpacity={0.8}
                  onPress={onSendOtp}
                  disabled={loading || !canSendEmail}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.foreground} />
                  ) : (
                    <Text className="text-base font-bold tracking-wide text-foreground">
                      {t("AccountLinking.sendCode")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[52px] rounded-xl justify-center items-center bg-backgroundDark"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text className="text-base font-bold tracking-wide text-textSub">
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === "otp" && (
            <>
              <View className="mb-6">
                <Text className="text-sm font-normal tracking-wide text-textSub">
                  {t("AccountLinking.subtitleOtp", { email })}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold mb-1.5 tracking-wide text-text">
                  {t("AccountLinking.otpLabel")}
                </Text>
                <View className="rounded-xl border bg-foreground border-primary">
                  <TextInput
                    className="h-[50px] px-4 text-2xl tracking-[8px] text-center font-bold text-text"
                    placeholder={"12345678"}
                    placeholderTextColor={COLORS.textSub}
                    value={otp}
                    onChangeText={handleOtpChange}
                    keyboardType="number-pad"
                    autoFocus
                    editable={!loading}
                  />
                </View>
              </View>

              {error ? (
                <Text className="text-sm text-center mb-3 text-coral">
                  {error}
                </Text>
              ) : null}

              <View className="gap-[10px] mt-2">
                <TouchableOpacity
                  className={`h-[52px] rounded-xl justify-center items-center bg-darkObject ${
                    !canVerifyOtp || loading ? "opacity-50" : "opacity-100"
                  }`}
                  activeOpacity={0.8}
                  onPress={onVerifyOtp}
                  disabled={loading || !canVerifyOtp}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.foreground} />
                  ) : (
                    <Text
                      numberOfLines={1}
                      className="text-base font-bold tracking-wide text-foreground"
                    >
                      {t("AccountLinking.verify")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[52px] rounded-xl justify-center items-center bg-backgroundDark"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text className="text-base font-bold tracking-wide text-textSub">
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="mt-3 items-center py-2"
                onPress={onSendOtp}
                disabled={loading}
              >
                <Text className="text-sm font-semibold text-green">
                  {t("AccountLinking.resend")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === "selection" && (
            <>
              <Text className="text-sm mb-5 leading-5 tracking-wide text-textSub">
                {t("AccountLinking.selectionMessage")}
              </Text>

              {!existingPreview || !guestSnapshot ? (
                <View className="py-6 items-center">
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : (
                <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity
                    className={`flex-1 rounded-xl p-4 items-center bg-foreground ${
                      selection === "guest"
                        ? "border-2 border-primary"
                        : "border border-backgroundDark"
                    }`}
                    activeOpacity={0.7}
                    onPress={() => setSelection("guest")}
                    disabled={loading}
                  >
                    <Text className="text-xs font-bold mb-1 tracking-wide text-textSub">
                      {t("AccountLinking.thisDevice")}
                    </Text>
                    <Text className="text-base font-extrabold text-text">
                      {guestSnapshot.username}
                    </Text>
                    <Text className="text-xs mt-1 text-textSub">
                      9x9: {guestSnapshot.points9}pt / 13x13:{" "}
                      {guestSnapshot.points13}pt
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 rounded-xl p-4 items-center bg-foreground ${
                      selection === "existing"
                        ? "border-2 border-primary"
                        : "border border-backgroundDark"
                    }`}
                    activeOpacity={0.7}
                    onPress={() => setSelection("existing")}
                    disabled={loading}
                  >
                    <Text className="text-xs font-bold mb-1 tracking-wide text-primary">
                      {t("AccountLinking.savedAccount")}
                    </Text>
                    <Text className="text-base font-extrabold text-text">
                      {existingPreview.username}
                    </Text>
                    <Text className="text-xs mt-1 text-textSub">
                      9x9: {existingPreview.points_9}pt / 13x13:{" "}
                      {existingPreview.points_13}pt
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {error ? (
                <Text className="text-sm text-center mb-3 text-coral">
                  {error}
                </Text>
              ) : null}

              <View className="gap-[10px] mt-2">
                <TouchableOpacity
                  className={`h-[48px] rounded-xl justify-center items-center ${
                    canConfirmSelection && !loading
                      ? "bg-darkObject"
                      : "bg-backgroundDark"
                  }`}
                  activeOpacity={0.8}
                  onPress={onConfirmSelection}
                  disabled={loading || !canConfirmSelection}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.foreground} />
                  ) : (
                    <Text className="text-[15px] font-extrabold tracking-wide text-foreground">
                      {t("AccountLinking.confirmSelection")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[48px] rounded-xl justify-center items-center bg-backgroundDark"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text className="text-base font-bold tracking-wide text-textSub">
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}