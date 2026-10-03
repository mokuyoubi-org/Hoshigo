// DeleteModal.tsx

import { useTranslation } from "@/src/active/i18n/LangProvider";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";
import { AppText } from "../components/common/AppText";
import { AppTextInput } from "../components/common/AppTextInput";
import { useColors } from "../hooks/useTheme";

type Props = {
  username: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function DeleteModal({ username, onConfirm, onCancel }: Props) {
  const colors = useColors();
  const t = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm = input === username && !loading;

  const handleClose = () => {
    setInput("");
    onCancel();
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

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
        <View className="flex-row justify-between items-center mb-2">
          <AppText className="text-xl tracking-wide flex-1 text-failure">
            {t("DeleteModal.title")}
          </AppText>
        </View>

        <AppText className="text-sm mb-4 tracking-wide text-textSub">
          {t("DeleteModal.message")}
        </AppText>

        <AppText className="text-sm mb-2 tracking-wide text-text">
          {t("DeleteModal.confirmLabel", { username })}
        </AppText>

        <View className="rounded-xl border border-2 mb-6 bg-foreground border-primaryStrong">
          <AppTextInput
            className="h-12 px-4 text-base text-text" // text-baseはテキストの大きさ。fontの種類や太さとは別の話なので消さない
            placeholder={username}
            placeholderTextColor={colors.textOpacity} // 絵文字対策
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View className="gap-2">
          <TouchableOpacity
            className={`h-12 rounded-xl justify-center items-center ${
              canConfirm ? "bg-failure" : "bg-failureLight"
            }`}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            {loading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <AppText className="text-foreground text-base">
                {t("DeleteModal.confirm")}
              </AppText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="h-12 rounded-xl justify-center items-center bg-backgroundStrong"
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.8}
          >
            <AppText className="text-textSub text-base">
              {t("common.cancel")}
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
