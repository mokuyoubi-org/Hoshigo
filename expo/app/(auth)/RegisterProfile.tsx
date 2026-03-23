// app/RegisterProfile.tsx
import ConfirmUsernameModal from "@/src/components/Modals/ConfirmUsernameModal";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import {
  DisplaynameContext,
  UidContext,
  UsernameContext,
} from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { supabase } from "@/src/services/supabase";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useState } from "react";
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

import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";
import { Lang } from "@/src/services/translations";
import * as hangulRomanization from "hangul-romanization";
import { pinyin } from "pinyin-pro";
import * as wanakana from "wanakana";

export const generateUsername = (text: string, lang: Lang): string => {
  let username = "";
  switch (lang) {
    case "ja":
      username = wanakana.toRomaji(text);
      break;
    case "ko":
      username = hangulRomanization.convert(text);
      break;
    case "zh":
      username = pinyin(text, { toneType: "none", type: "array" }).join("");
      break;
    case "en":
      username = text.toLowerCase();
      break;
    default:
      username = wanakana.toRomaji(text);
  }
  return username;
};

const displaynameMaxLength = {
  ja: 7,
  en: 12,
  zh: 7,
  ko: 7,
};

const isValidDisplayname = (text: string, lang: Lang) => {
  const max = displaynameMaxLength[lang] ?? displaynameMaxLength.en;

  switch (lang) {
    case "ja":
      return new RegExp(`^[ぁ-ゖァ-ヶー〜]{1,${max}}$`).test(text);

    case "ko":
      return new RegExp(`^[가-힣]{1,${max}}$`).test(text);

    case "zh":
      return new RegExp(`^[\\u4e00-\\u9fff]{1,${max}}$`).test(text);

    case "en":
      return new RegExp(`^[A-Za-z]{1,${max}}$`).test(text);

    default:
      return new RegExp(`^[A-Za-z]{1,${max}}$`).test(text);
  }
};

export default function RegisterProfile() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const uid = useContext<string | null>(UidContext);
  const { username, setUsername } = useContext(UsernameContext)!;
  const { displayname, setDisplayname } = useContext(DisplaynameContext)!;
  const { lang } = useContext(LangContext)!;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // モーダル用state
  const [modalVisible, setModalVisible] = useState(false);
  const [resolvedUsername, setResolvedUsername] = useState<string>("");

  useEffect(() => {
    if (!uid) router.replace("/Login");
  }, [uid]);

  // 「登録する」ボタン押下 → RPCでユーザー名解決 → 被りあればモーダル
  const onRegisterUsername = async () => {
    setError("");

    if (!displayname || displayname.trim() === "") {
      setError(t("RegisterProfile.errorDisplaynameRequired"));
      return;
    }
    if (!isValidDisplayname(displayname, lang)) {
      setError(
        t("RegisterProfile.errorDisplaynameInvalid", {
          max: displaynameMaxLength[lang],
        }),
      );
      return;
    }

    setLoading(true);

    // RPC: ユーザー名の空き番号を解決する
    const { data, error: rpcError } = await supabase.rpc("resolve_username", {
      p_username: username,
    });

    setLoading(false);

    if (rpcError || data === null) {
      setError(t("RegisterProfile.errorCheckFailed"));
      return;
    }

    // RPCが返した（被りなし or 連番付き）ユーザー名をstateに保存
    setResolvedUsername(data as string);
    // モーダルを表示
    setModalVisible(true);
  };

  // モーダルで「はい」→ 実際に登録
  const onConfirmRegister = async () => {
    setModalVisible(false);
    setLoading(true);

    const { error: rpcError } = await supabase.rpc("register_profile", {
      p_username: resolvedUsername,
      p_displayname: displayname,
    });

    setLoading(false);

    if (rpcError) {
      setError(t("RegisterProfile.errorRegistrationFailed"));
      return;
    }

    if (setUsername) setUsername(resolvedUsername);
    if (setDisplayname) setDisplayname(displayname!);
    router.replace({ pathname: "/(tabs)/PlayerPage" });
  };

  // モーダルで「いいえ」→ 閉じるだけ
  const onCancelModal = () => {
    setModalVisible(false);
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
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("RegisterProfile.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t("RegisterProfile.subtitle")}
            </Text>
          </View>

          <View style={styles.form}>
            {/* 表示名入力 */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("common.displayname")}
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
                  placeholder={t("RegisterProfile.displaynamePlaceholder")}
                  placeholderTextColor={colors.inactive}
                  value={displayname ?? ""}
                  onChangeText={(text) => {
                    setDisplayname?.(text);
                    if (setUsername) setUsername(generateUsername(text, lang));
                  }}
                  editable={!loading}
                />
              </View>
              {displayname && !isValidDisplayname(displayname, lang) && (
                <Text
                  style={[styles.validationText, { color: colors.subtext }]}
                >
                  {t("RegisterProfile.displaynameValidation")}
                </Text>
              )}
            </View>

            {/* ユーザー名（自動生成・表示のみ） */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.button }]}>
                {t("common.username")}
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
                    { color: username ? colors.text : colors.inactive },
                  ]}
                >
                  {username || "username"}
                </Text>
              </View>
            </View>

            {/* 登録ボタン */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: colors.button },
                (!displayname ||
                  !isValidDisplayname(displayname, lang) ||
                  loading) && { backgroundColor: colors.inactive },
              ]}
              activeOpacity={0.8}
              onPress={onRegisterUsername}
              disabled={
                !displayname ||
                !isValidDisplayname(displayname, lang) ||
                loading
              }
            >
              <Text style={[styles.registerButtonText, { color: colors.card }]}>
                {t("common.register")}
              </Text>
            </TouchableOpacity>

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
                {t("common.back")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <LoadingModal text={t("common.loading")} visible={loading} />
      </KeyboardAvoidingView>

      {/* 確認モーダル */}
      <ConfirmUsernameModal
        visible={modalVisible}
        displayname={displayname ?? ""}
        resolvedUsername={resolvedUsername}
        username={username ?? ""}
        onConfirm={onConfirmRegister}
        onCancel={onCancelModal}
      />
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
