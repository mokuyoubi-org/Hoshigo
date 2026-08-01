// app/RegisterProfile.tsx
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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

import { useTranslation } from "@/src/active/hooks/useTranslation";
import { useProfile } from "../active/contexts/ProfileContexts";

// username用のシンプルなバリデーション:
// 英数字とアンダースコアのみ、3〜20文字
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

const isValidUsername = (text: string): boolean => {
  return new RegExp(`^[A-Za-z0-9_]{${USERNAME_MIN},${USERNAME_MAX}}$`).test(
    text,
  );
};

export default function RegisterProfile() {
  const t = useTranslation();

  const { profile, updateProfile } = useProfile();
  const { uid, username } = profile;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) router.replace("/Login");
  }, []);

  // 「登録する」ボタン押下 → そのままregister_profileを呼ぶ
  // 被っていればRPCがusername_takenエラーを返すので、それを拾って赤字表示
  const onRegister = async () => {
    setError("");

    if (!username || !isValidUsername(username)) {
      setError(
        t("RegisterProfile.errorUsernameInvalid", {
          min: USERNAME_MIN,
          max: USERNAME_MAX,
        }),
      );
      return;
    }

    setLoading(true);

    const { error: rpcError } = await supabase.rpc("register_profile", {
      p_username: username,
    });

    setLoading(false);

    if (rpcError) {
      if (rpcError.message?.includes("username_taken")) {
        setError(t("RegisterProfile.errorUsernameTaken"));
      } else {
        setError(t("RegisterProfile.errorRegistrationFailed"));
      }
      return;
    }

    router.replace("/(tabs)/Profile");
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
          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {t("RegisterProfile.title")}
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.textSub }]}>
              {t("RegisterProfile.subtitle")}
            </Text>
          </View>

          <View style={styles.form}>
            {/* username入力(手入力に統一) */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: COLORS.text }]}>
                {t("common.username")}
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
                <Text style={[styles.prefix, { color: COLORS.textSub }]}>
                  @
                </Text>
                <TextInput
                  style={[styles.inputFull, { color: COLORS.text }]}
                  placeholder={t("RegisterProfile.usernamePlaceholder")}
                  placeholderTextColor={COLORS.textSub}
                  value={username ?? ""}
                  onChangeText={(text) => {
                    setError("");
                    updateProfile({ username: text });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              {username && !isValidUsername(username) && (
                <Text
                  style={[styles.validationText, { color: COLORS.textSub }]}
                >
                  {t("RegisterProfile.usernameValidation", {
                    min: USERNAME_MIN,
                    max: USERNAME_MAX,
                  })}
                </Text>
              )}
            </View>

            {/* 登録ボタン */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: COLORS.primary },
                (!username || !isValidUsername(username) || loading) && {
                  backgroundColor: COLORS.backgroundDark,
                },
              ]}
              activeOpacity={0.8}
              onPress={onRegister}
              disabled={!username || !isValidUsername(username) || loading}
            >
              <Text style={[styles.registerButtonText, { color: COLORS.text }]}>
                {t("common.register")}
              </Text>
            </TouchableOpacity>

            {/* エラー表示(重複含む) */}
            {error ? (
              <Text style={[styles.errorText, { color: "red" }]}>{error}</Text>
            ) : null}

            {/* 戻るボタン */}
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: COLORS.background,
                  borderColor: COLORS.primary,
                },
              ]}
              activeOpacity={0.8}
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace("/Login");
              }}
              disabled={loading}
            >
              <Text style={[styles.backButtonText, { color: COLORS.text }]}>
                {t("common.back")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <LoadingModal text={t("common.loading")} visible={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// styles は元のものをそのまま使用
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
    flexDirection: "row",
    alignItems: "center",
  },
  inputFull: {
    flex: 1,
    height: 56,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  prefix: {
    paddingLeft: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  validationText: {
    fontSize: 12,
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
