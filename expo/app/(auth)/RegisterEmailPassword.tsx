import LoadingModal from "@/src/components/Modals/LoadingModal";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { isValidEmail, isValidPassword } from "@/src/lib/utils";
import { supabase } from "@/src/services/supabase";
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
  const { t } = useTranslation();
  const { colors } = useTheme();
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
              {t("RegisterEmailPassword.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t("RegisterEmailPassword.subtitle")}
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("common.email")}
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
                  placeholder={"example@email.com"}
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
                  {t("RegisterEmailPassword.emailValidation")}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("common.password")}
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
                  placeholder={"••••••••"}
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
                  {t("RegisterEmailPassword.passwordValidation")}
                </Text>
              )}
            </View>

            {/* 登録ボタン */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: colors.button },
                (!canRegister || loading) && {
                  backgroundColor: colors.inactive,
                },
              ]}
              activeOpacity={0.8}
              onPress={onRegisterEmailPassword}
              disabled={!canRegister || loading}
            >
              <Text style={[styles.registerButtonText, { color: colors.card }]}>
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
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => router.push("/Login")}
              disabled={loading}
            >
              <Text style={[styles.backButtonText, { color: colors.button }]}>
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
    color: "#e53e3e",
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
