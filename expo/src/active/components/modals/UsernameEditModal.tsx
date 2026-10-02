// UsernameEditModal.tsx

import {
  normalizeUsername,
  UsernameValidationError,
  validateUsername,
} from "@/src/stable/logics/validationLogics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";
import { useColors } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n/LangProvider";
import { TranslationKey } from "../../i18n/types";
import { AppText } from "../common/AppText";
import { AppTextInput } from "../common/AppTextInput";

type Props = {
  visible: boolean;
  currentUsername: string;
  onClose: () => void;
  onSubmit: (
    newUsername: string,
  ) => Promise<string | null | void> | string | null | void;
};

export default function UsernameEditModal({
  visible,
  currentUsername,
  onClose,
  onSubmit,
}: Props) {
  const t = useTranslation();
  const colors = useColors();
  const [inputUsername, setInputUsername] = useState(currentUsername);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const errorKeyMap: Record<
    NonNullable<UsernameValidationError>,
    TranslationKey
  > = {
    required: "UsernameEditModal.errorRequired",
    length: "UsernameEditModal.errorLength",
    invalidFormat: "UsernameEditModal.errorInvalidFormat",
  };

  const validate = (text: string) => {
    const errorType = validateUsername(text);
    if (!errorType) return "";

    return t(errorKeyMap[errorType]);
  };

  const handleChangeText = (text: string) => {
    setInputUsername(text);
    setErrorMessage(validate(text));
  };

  const handleSubmit = async () => {
    // 送信・チェック前に掃除(NFC正規化 + 見えない絵文字パーツの除去)
    const normalized = normalizeUsername(inputUsername);
    const error = validate(normalized);
    if (error) {
      setErrorMessage(error);
      return;
    }
    try {
      setLoading(true);
      const serverError = await onSubmit(normalized);
      if (serverError) {
        setErrorMessage(serverError);
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const isSaveDisabled =
    !!errorMessage ||
    inputUsername === currentUsername ||
    inputUsername.trim() === "" ||
    loading;

  if (!visible) return null;

  return (
    <ModalShell
      size="lg"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full"
      >
        <View className="flex-row justify-between items-center mb-6">
          <AppText className="text-2xl tracking-wider text-text">
            {t("UsernameEditModal.title")}
          </AppText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full">
            <View className="mb-4">
              <AppText className="text-sm mb-2 tracking-wide text-text">
                {t("UsernameEditModal.placeholder")}
              </AppText>
              <View className="rounded-xl border bg-foreground border-2 border-primaryStrong">
                <AppTextInput
                  className="h-12 px-4 text-base text-text"
                  placeholder={t("UsernameEditModal.placeholder")}
                  placeholderTextColor={colors.textOpacity} // 絵文字対策
                  value={inputUsername}
                  onChangeText={handleChangeText}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  autoFocus
                />
              </View>
            </View>

            {errorMessage ? (
              <View className="mb-3">
                <AppText className="text-sm text-center text-failure">
                  {errorMessage}
                </AppText>
              </View>
            ) : null}

            <View className="gap-2 mt-2">
              <TouchableOpacity
                className={`h-12 rounded-xl justify-center items-center ${
                  isSaveDisabled ? "bg-primaryStrong" : "bg-blackStone"
                }`}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={isSaveDisabled}
              >
                {loading ? (
                  <ActivityIndicator color={colors.foreground} />
                ) : (
                  <AppText className="text-base tracking-wide text-foreground">
                    {t("UsernameEditModal.save")}
                  </AppText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 rounded-xl justify-center items-center bg-backgroundStrong"
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.8}
              >
                <AppText className="text-base tracking-wide text-textSub">
                  {t("common.cancel")}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
