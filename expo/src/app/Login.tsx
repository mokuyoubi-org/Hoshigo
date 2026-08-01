import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import GoogleSignInButton from "@/src/stable/components/google/GoogleSignInButton";
import {
  isValidEmail,
  isValidPassword,
} from "@/src/stable/logics/validationLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
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

// これは必要っぽい
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canLogin = isValidEmail(email) && isValidPassword(password);
  const t = useTranslation();

  const onLogin = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      if (!error.message.includes("Email not confirmed")) {
        setError(t("Login.errorInvalidCredentials"));
      } else {
        setError(t("Login.errorEmailNotConfirmed"));
      }
      return;
    }

    router.replace("/(tabs)/Home");
  };

  const handleGuestLogin = async () => {
    router.replace("/Home");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {t("Login.welcome")}
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.textSub }]}>
              {t("Login.subtitle")}
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: COLORS.text }]}>
                {t("common.email")}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: COLORS.foreground,
                    borderColor: COLORS.primary,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
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
                <Text
                  style={[styles.validationText, { color: COLORS.textSub }]}
                >
                  {t("Login.emailValidation")}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: COLORS.text }]}>
                  {t("common.password")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    router.push("/ForgotPassword");
                  }}
                >
                  <Text style={styles.forgotPasswordText}>
                    {t("Login.forgotPassword")}
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: COLORS.foreground,
                    borderColor: COLORS.primary,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: COLORS.text }]}
                  placeholder={"••••••••"}
                  placeholderTextColor={COLORS.textSub}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {password && !isValidPassword(password) && (
                <Text
                  style={[styles.validationText, { color: COLORS.textSub }]}
                >
                  {t("Login.passwordValidation")}
                </Text>
              )}
            </View>

            {/* メッセージ表示 */}
            {params?.message && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.messageText}>{params.message}</Text>
              </View>
            )}

            {/* エラー表示 */}
            {error && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ログインボタン */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: COLORS.darkObject },
                (!canLogin || loading) && {
                  backgroundColor: COLORS.primaryLight,
                },
              ]}
              activeOpacity={0.8}
              onPress={onLogin}
              disabled={!canLogin || loading}
            >
              <Text
                style={[styles.loginButtonText, { color: COLORS.foreground }]}
              >
                {t("common.login")}
              </Text>
            </TouchableOpacity>

            {/* 区切り線 */}
            <View style={styles.dividerContainer}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: COLORS.primary },
                ]}
              />
              <Text style={[styles.dividerText, { color: COLORS.textSub }]}>
                {t("Login.or")}
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: COLORS.primary },
                ]}
              />
            </View>

            {/* ソーシャルログインとゲストログインを横並び */}
            <View style={styles.alternativeLoginContainer}>
              {/* Google */}
              <GoogleSignInButton />

              {/* ゲストログインボタン */}
              <TouchableOpacity
                style={[
                  styles.guestButton,
                  {
                    backgroundColor: COLORS.foreground,
                    borderColor: COLORS.primary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={handleGuestLogin}
                disabled={loading}
              >
                <Text
                  style={[styles.guestButtonText, { color: COLORS.textSub }]}
                >
                  {t("Login.guestLogin")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 新規登録 */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: COLORS.textSub }]}>
                {t("Login.noAccount")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push("/RegisterEmailPassword");
                }}
              >
                <Text style={[styles.signupLink, { color: COLORS.clickable }]}>
                  {t("common.register")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <LoadingModal text={t("common.loading")} visible={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
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
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: COLORS.clickable,
    fontWeight: "600",
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  validationText: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  feedbackContainer: {
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.clickable,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
  },
  loginButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  alternativeLoginContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  guestButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
