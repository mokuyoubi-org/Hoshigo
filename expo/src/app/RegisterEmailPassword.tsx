import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import {
  isValidEmail,
  isValidPassword,
} from "@/src/stable/logics/validationLogics";
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

export default function RegisterEmailPassword() {
  const t = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const canRegister = isValidEmail(email) && isValidPassword(password);
  const [loading, setLoading] = useState(false);
  const redirectTo =
    Platform.OS === "web" ? "https://hoshigo.app/Login" : "hoshigo://Login";
  const onRegisterEmailPassword = async () => {
    setLoading(true); // 通信中フラグON
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    setLoading(false); // 通信終了

    if (error) {
      setError(t("RegisterEmailPassword.errorRegistrationFailed"));
      return;
    }

    router.replace({
      pathname: "/RegisterEmailSent",
      params: { email }, // メールアドレスを渡す
    });
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
              {t("RegisterEmailPassword.title")}
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.textSub }]}>
              {t("RegisterEmailPassword.subtitle")}
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
                  {t("RegisterEmailPassword.emailValidation")}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: COLORS.text }]}>
                {t("common.password")}
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
                  {t("RegisterEmailPassword.passwordValidation")}
                </Text>
              )}
            </View>

            {/* 登録ボタン */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: COLORS.primary },
                (!canRegister || loading) && {
                  backgroundColor: COLORS.backgroundDark,
                },
              ]}
              activeOpacity={0.8}
              onPress={onRegisterEmailPassword}
              disabled={!canRegister || loading}
            >
              <Text style={[styles.registerButtonText, { color: COLORS.text }]}>
                {t("common.register")}
              </Text>
            </TouchableOpacity>

            {/* エラー表示 */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* 戻るボタン */}
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: COLORS.primary,
                  borderColor: COLORS.primary,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => router.push("/Login")}
              disabled={loading}
            >
              <Text style={[styles.backButtonText, { color: COLORS.text }]}>
                {t("common.back")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loadingモーダル */}
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
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
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
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    height: 56,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  validationText: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  registerButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
