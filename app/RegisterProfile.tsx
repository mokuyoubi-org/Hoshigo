import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useState } from "react";
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
import {
  DisplayNameContext,
  SetDisplayNameContext,
  SetPointsContext,
  SetUserNameContext,
  UidContext,
  UserNameContext,
} from "../src/components/UserContexts";
import { supabase } from "../src/lib/supabase";
import { useTheme } from "../src/lib/useTheme";

import * as hangulRomanization from "hangul-romanization";
import * as wanakana from "wanakana";
import { pinyin } from "pinyin-pro";

export const generateUsername = (text: string, lang: string): string => {
  let username = "";

  switch (lang) {
    case "ja":
      username = wanakana.toRomaji(text);
      break;

    case "ko":
      username = hangulRomanization.convert(text);
      break;

    case "zh":
      // トーンなし・スペースなしで取得
      username = pinyin(text, {
        toneType: "none",
        type: "array",
      }).join("");
      break;

    case "en":
      username = text.toLowerCase();
      break;

    default:
      username = wanakana.toRomaji(text);
  }

  return username;
};

export default function RegisterProfile() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  // グローバルstate
  const uid = useContext<string | null>(UidContext);
  const userName = useContext<string | null>(UserNameContext);
  const setUserName = useContext<((value: string) => void) | null>(
    SetUserNameContext,
  );
  const displayName = useContext<string | null>(DisplayNameContext);
  const setDisplayName = useContext<((value: string) => void) | null>(
    SetDisplayNameContext,
  );
  const setPoints = useContext<((value: number) => void) | null>(
    SetPointsContext,
  );

  // ローカルstate
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 表示名のバリデーション
  // 日本語: ひらがな・カタカナ・伸ばし棒・にょろ 5文字まで
  // 韓国語: ハングル 3文字まで
  // 中国語: 漢字 2文字まで
  // 英語: アルファベット 10文字まで
  const isValidDisplayName = (text: string) => {
    const lang = i18n.language || "ja";
    switch (lang) {
      case "ja":
        return /^[ぁ-ゖァ-ヶー〜]{1,5}$/.test(text);
      case "ko":
        return /^[가-힣]{1,3}$/.test(text);
      case "zh":
        return /^[\u4e00-\u9fff]{1,2}$/.test(text);
      case "en":
        return /^[A-Za-z]{1,10}$/.test(text);
      default:
        return /^[ぁ-ゖァ-ヶー〜]{1,5}$/.test(text); // デフォルトは日本語ルール
    }
  };

  // バリデーションが通っているかチェック
  const isFormValid = () => {
    return userName && displayName && isValidDisplayName(displayName);
  };

  useEffect(() => {
    if (!uid) {
      router.replace("/Login");
    }
  }, [uid]);

  const onRegisterUsername = async () => {
    setError("");

    // バリデーションチェック
    if (!userName || userName.trim() === "") {
      setError(t("RegisterProfile.errorUsernameRequired"));
      return;
    }

    if (!displayName || displayName.trim() === "") {
      setError(t("RegisterProfile.errorDisplayNameRequired"));
      return;
    }

    if (!isValidDisplayName(displayName)) {
      setError(t("RegisterProfile.errorDisplayNameInvalid"));
      return;
    }

    setLoading(true); // 通信中フラグON

    // username が既に存在しないか確認
    const { data: existingUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", userName)
      .limit(1); // 1件だけ取ればよい

    setLoading(false); // 通信終了

    if (fetchError) {
      console.log("fetchError:", fetchError);
      setError(t("RegisterProfile.errorCheckFailed"));
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      setError(t("RegisterProfile.errorUsernameExists"));
      return;
    }

    console.log("registerusername");
    console.log("uid: ", uid);
    console.log("userName: ", userName);
    console.log("displayName: ", displayName);

    setLoading(true); // 再度通信開始

    // profilesテーブルを更新
    const { error: insertError } = await supabase.from("profiles").insert({
      uid: uid,
      username: userName,
      displayname: displayName,
    });

    setLoading(false); // 通信終了

    if (insertError) {
      setError(t("RegisterProfile.errorRegistrationFailed"));
      return;
    }

    if (
      uid &&
      userName &&
      setUserName &&
      displayName &&
      setDisplayName &&
      setPoints
    ) {
      setError(t("RegisterProfile.successMessage"));
      setUserName(userName);
      setDisplayName(displayName);
      setPoints(0);
      router.replace({ pathname: "/(tabs)/MyPage" });
    }
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
              {t("RegisterProfile.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t("RegisterProfile.subtitle")}
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            {/* 表示名入力 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("RegisterProfile.displayName")}
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
                  style={[styles.inputFull, { color: colors.text }]}
                  placeholder={t("RegisterProfile.displayNamePlaceholder")}
                  placeholderTextColor={colors.inactive}
                  value={displayName ?? ""}
                  onChangeText={(text) => {
                    setDisplayName?.(text);
                    if (setUserName) {
                      setUserName(
                        generateUsername(text, i18n.language || "en"),
                      );
                    }
                  }}
                  editable={!loading}
                />
              </View>
              {displayName && !isValidDisplayName(displayName) && (
                <Text
                  style={[styles.validationText, { color: colors.subtext }]}
                >
                  {t("RegisterProfile.displayNameValidation")}
                </Text>
              )}
            </View>

            {/* ユーザー名表示（自動生成・編集不可） */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("RegisterProfile.username")}
              </Text>
              <View
                style={[
                  styles.usernameDisplay,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <Text style={[styles.prefix, { color: colors.subtext }]}>
                  @
                </Text>
                <Text
                  style={[
                    styles.usernameText,
                    { color: userName ? colors.text : colors.inactive },
                  ]}
                >
                  {userName || t("RegisterProfile.usernamePlaceholder")}
                </Text>
              </View>
            </View>

            {/* 登録ボタン */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: colors.button },
                (!isFormValid() || loading) && {
                  backgroundColor: colors.inactive,
                },
              ]}
              activeOpacity={0.8}
              onPress={onRegisterUsername}
              disabled={!isFormValid() || loading}
            >
              <Text style={[styles.registerButtonText, { color: colors.card }]}>
                {t("RegisterProfile.registerButton")}
              </Text>
            </TouchableOpacity>

            {/* エラー表示 */}
            {error ? (
              <Text style={[styles.errorText, { color: colors.text }]}>
                {error}
              </Text>
            ) : null}

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
                {t("RegisterProfile.backButton")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* ← ここがLoadingオーバーレイ */}
        {loading && <LoadingOverlay text={t("RegisterProfile.registering")} />}
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
    flexDirection: "row",
    alignItems: "center",
  },
  inputFull: {
    flex: 1,
    height: 56,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  usernameDisplay: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    opacity: 0.6, // 編集不可を視覚的に示す
  },
  prefix: {
    paddingLeft: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  usernameText: {
    paddingHorizontal: 8,
    fontSize: 16,
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