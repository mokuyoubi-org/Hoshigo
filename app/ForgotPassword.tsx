import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import LoadingOverlay from "../src/components/LoadingOverlay";
import { supabase } from "../src/lib/supabase";
import { isValidEmail } from "../src/lib/utils";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSendResetEmail = async () => {
    if (!isValidEmail(email)) {
      setError(t("ForgotPassword.errorInvalidEmail"));
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // redirectTo: "hoshigo://reset-password",
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
            <Text style={styles.backButtonText}>
              ← {t("ForgotPassword.back")}
            </Text>
          </TouchableOpacity>

          {!success ? (
            <>
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
                  <Text style={styles.label}>{t("ForgotPassword.email")}</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder={t("ForgotPassword.emailPlaceholder")}
                      placeholderTextColor="#999999"
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
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        {loading && <LoadingOverlay text={t("ForgotPassword.sending")} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    color: "#2d3748",
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
    color: "#1a202c",
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#718096",
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
    color: "#2d3748",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1a202c",
  },
  validationText: {
    fontSize: 13,
    color: "#718096",
    marginTop: 4,
    marginLeft: 4,
  },
  feedbackContainer: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#d15c5c",
    textAlign: "center",
  },
  sendButton: {
    backgroundColor: "#2d3748",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#cbd5e0",
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
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
    backgroundColor: "#48bb78",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    color: "#ffffff",
    fontWeight: "700",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  successMessage: {
    fontSize: 15,
    color: "#718096",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: "#2d3748",
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
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  resendButton: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  resendButtonText: {
    fontSize: 15,
    color: "#5badeb",
    fontWeight: "600",
  },
});
