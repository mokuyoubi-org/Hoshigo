// ForgotPassword.tsx
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { isValidEmail } from "@/src/stable/logics/validationLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useTranslation();

  const onSendResetEmail = async () => {
    if (!isValidEmail(email)) {
      setError(t("ForgotPassword.errorInvalidEmail"));
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "hoshigo://Login",
    });

    setLoading(false);

    if (error) {
      setError(t("ForgotPassword.errorSendFailed"));
      return;
    }

    setSuccess(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* 戻るボタン */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← {t("common.back")}</Text>
          </TouchableOpacity>

          {!success ? (
            <View>
              {/* ヘッダー */}
              <View style={styles.header}>
                <Text style={styles.title}>{t("ForgotPassword.title")}</Text>
                <Text style={styles.subtitle}>
                  {t("ForgotPassword.subtitle")}
                </Text>
              </View>

              {/* フォーム */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t("common.email")}</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder={"example@email.com"}
                      placeholderTextColor={COLORS.textSub}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>
                  {email && !isValidEmail(email) && (
                    <Text style={styles.validationText}>
                      {t("ForgotPassword.emailValidation")}
                    </Text>
                  )}
                </View>

                {/* エラー表示 */}
                {error && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* 送信ボタン */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!isValidEmail(email) || loading) &&
                      styles.sendButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={onSendResetEmail}
                  disabled={!isValidEmail(email) || loading}
                >
                  <Text style={styles.sendButtonText}>
                    {t("ForgotPassword.sendButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {/* 成功画面 */}
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.successTitle}>
                  {t("ForgotPassword.successTitle")}
                </Text>
                <Text style={styles.successMessage}>
                  {t("ForgotPassword.successMessage", { email })}
                </Text>

                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backToLoginButtonText}>
                    {t("ForgotPassword.backToLogin")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                >
                  <Text style={styles.resendButtonText}>
                    {t("ForgotPassword.resendDifferent")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <LoadingModal text={t("common.loading")} visible={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSub,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: COLORS.foreground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  validationText: {
    fontSize: 13,
    color: COLORS.textSub,
    marginTop: 4,
    marginLeft: 4,
  },
  feedbackContainer: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.background,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.foreground,
    letterSpacing: 0.5,
  },
  successContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.safe,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    color: COLORS.foreground,
    fontWeight: "700",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  successMessage: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  backToLoginButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.foreground,
    letterSpacing: 0.5,
  },
  resendButton: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  resendButtonText: {
    fontSize: 15,
    color: COLORS.clickable,
    fontWeight: "600",
  },
});
