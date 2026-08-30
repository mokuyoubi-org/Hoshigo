// UsernameEditModal.tsx
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
import { validateUsername } from "@/src/stable/logics/validationLogics";
import { ModalShell } from "modal-shell";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { dictionary } from "../../language/dictionary";
interface UsernameEditModalProps {
  visible: boolean;
  currentUsername: string;
  onClose: () => void;
  onSubmit: (
    newUsername: string,
  ) => Promise<string | null | void> | string | null | void;
  lang?: "en";
}

export default function UsernameEditModal({
  visible,
  currentUsername,
  onClose,
  onSubmit,
  lang = "en",
}: UsernameEditModalProps) {
  const tTranslation = useTranslation();
  const [inputUsername, setInputUsername] = useState(currentUsername);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const t = dictionary.UsernameEditModal[lang];

  const validate = (text: string) => {
    const errorType = validateUsername(text);
    if (!errorType) return "";

    return t.errors[errorType];
  };

  const handleChangeText = (text: string) => {
    setInputUsername(text);
    setErrorMessage(validate(text));
  };

  const handleSubmit = async () => {
    const error = validate(inputUsername);
    if (error) {
      setErrorMessage(error);
      return;
    }
    try {
      setLoading(true);
      const serverError = await onSubmit(inputUsername);
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
    <ModalShell size="lg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full"
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-extrabold tracking-wider text-text">
            {t.title}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full">
            <View className="mb-4">
              <Text className="text-sm font-semibold mb-1.5 tracking-wide text-text">
                {t.placeholder}
              </Text>
              <View className="rounded-xl border bg-foreground border-primary">
                <TextInput
                  className="h-[50px] px-4 text-base text-text"
                  placeholder={t.placeholder}
                  placeholderTextColor={COLORS.textSub}
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
                <Text className="text-sm text-center text-coral">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View className="gap-[10px] mt-2">
              <TouchableOpacity
                className={`h-[52px] rounded-xl justify-center items-center ${
                  isSaveDisabled ? "bg-primaryLight" : "bg-darkObject"
                }`}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={isSaveDisabled}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.foreground} />
                ) : (
                  <Text className="text-base font-bold tracking-wide text-foreground">
                    {t.save}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="h-[52px] rounded-xl justify-center items-center bg-backgroundDark"
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text className="text-base font-bold tracking-wide text-textSub">
                  {tTranslation("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
