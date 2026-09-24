// EmailChangeModal.tsx
// 2026/09/24⚠️大事: supabaseで、Authentication▶︎Sign In/Providers▶︎Auth Providers▶︎Email(Enabled)▶︎Secure email changeをオフにすること。
import { COLORS } from "@/src/active/constants/colors";
import { useEmailChangeModal } from "@/src/active/hooks/useEmailChangeModal";
import React from "react";
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
import { ModalShell } from "ui-atoms";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function EmailChangeModal({ visible, onClose }: Props) {
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
    <ModalShell size="lg">
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
                <Text className="text-lg font-normal tracking-wide text-textSub">
                  {t("EmailChange.subtitleEmail")}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-lg font-semibold mb-1.5 tracking-wide text-text">
                  {t("EmailChange.newEmail")}
                </Text>
                <View className="rounded-xl border bg-foreground border-primary">
                  <TextInput
                    className="h-[50px] px-4 text-lg text-text"
                    placeholder={"example@email.com"}
                    placeholderTextColor={COLORS.textSub}
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
                <Text className="text-lg text-center mb-3 text-coral">
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
                    <Text className="text-lg font-bold tracking-wide text-foreground">
                      {t("EmailChange.sendCode")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[52px] rounded-xl justify-center items-center bg-backgroundDark"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text className="text-lg font-bold tracking-wide text-textSub">
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === "otp" && (
            <>
              <View className="mb-6">
                <Text className="text-lg font-normal tracking-wide text-textSub">
                  {t("EmailChange.subtitleOtp", { email: newEmail })}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-lg font-semibold mb-1.5 tracking-wide text-text">
                  {t("EmailChange.otpLabel")}
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
                <Text className="text-lg text-center mb-3 text-coral">
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
                      className="text-lg font-bold tracking-wide text-foreground"
                    >
                      {t("EmailChange.verify")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="h-[52px] rounded-xl justify-center items-center bg-backgroundDark"
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text className="text-lg font-bold tracking-wide text-textSub">
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="mt-3 items-center py-2"
                onPress={onSendOtp}
                disabled={loading}
              >
                <Text className="text-lg font-semibold text-green">
                  {t("AccountLinking.resend")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
