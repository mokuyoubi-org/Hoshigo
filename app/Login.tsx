import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleSignInButton from "../src/components/GoogleSignInButton";
import LoadingOverlay from "../src/components/LoadingOverlay";
import { supabase } from "../src/lib/supabase";
import { useTheme } from "../src/lib/useTheme";
import { isValidEmail, isValidPassword } from "../src/lib/utils";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canLogin = isValidEmail(email) && isValidPassword(password);



  // ← これを追加
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("📱 Login screen - Deep link:", url);

      const [path, fragment] = url.split("#");
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (type === "signup" && accessToken && refreshToken) {
        console.log("🔐 Signup link detected in Login screen");
        setLoading(true);

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        setLoading(false);

        if (error) {
          console.error("Session setup error:", error);
          setError("セッションの確立に失敗しました");
        } else if (data.session) {
          console.log("✅ Session established, navigating to RegisterProfile");
          // AppProvidersのonAuthStateChangeが発火してRegisterProfileに遷移する
        }
      }
    };

    // 初期URL（アプリが閉じている状態からリンクをタップした場合）
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // URL変更を監視（アプリが起動している状態でリンクをタップした場合）
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, []);








  const onLogin = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
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

    router.replace("/");
  };

  const handleGuestLogin = async () => {
    router.replace("/Home");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("Login.welcome")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t("Login.subtitle")}
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("Login.email")}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("Login.emailPlaceholder")}
                  placeholderTextColor={colors.inactive}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {email && !isValidEmail(email) && (
                <Text
                  style={[styles.validationText, { color: colors.subtext }]}
                >
                  {t("Login.emailValidation")}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: colors.button }]}>
                  {t("Login.password")}
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
                    backgroundColor: colors.card,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("Login.passwordPlaceholder")}
                  placeholderTextColor={colors.inactive}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {password && !isValidPassword(password) && (
                <Text
                  style={[styles.validationText, { color: colors.subtext }]}
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
                { backgroundColor: colors.button },
                (!canLogin || loading) && { backgroundColor: colors.inactive },
              ]}
              activeOpacity={0.8}
              onPress={onLogin}
              disabled={!canLogin || loading}
            >
              <Text style={[styles.loginButtonText, { color: colors.card }]}>
                {t("Login.loginButton")}
              </Text>
            </TouchableOpacity>

            {/* 区切り線 */}
            <View style={styles.dividerContainer}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.borderColor },
                ]}
              />
              <Text style={[styles.dividerText, { color: colors.subtext }]}>
                {t("Login.or")}
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.borderColor },
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
                    backgroundColor: colors.card,
                    borderColor: colors.borderColor,
                  },
                ]}
                activeOpacity={0.8}
                onPress={handleGuestLogin}
                disabled={loading}
              >
                <Text
                  style={[styles.guestButtonText, { color: colors.subtext }]}
                >
                  {t("Login.guestLogin")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 新規登録 */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.subtext }]}>
                {t("Login.noAccount")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push("/RegisterEmailPassword");
                }}
              >
                <Text style={[styles.signupLink, { color: colors.button }]}>
                  {t("Login.signUp")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading && <LoadingOverlay text={t("Login.loggingIn")} />}
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
    color: "#5badeb",
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
    color: "#5badeb",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#d15c5c",
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
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "600",
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