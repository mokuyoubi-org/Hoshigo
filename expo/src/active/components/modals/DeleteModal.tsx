// DeleteModal.tsx
import { ModalShell } from "modal-shell";
import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  username: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function DeleteModal({ username, onConfirm, onCancel }: Props) {
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
    <ModalShell size="lg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full"
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[18px] font-bold tracking-wide flex-1 text-coral">
            {t("DeleteModal.title")}
          </Text>
        </View>

        <Text className="text-sm mb-4 leading-5 tracking-wide text-textSub">
          {t("DeleteModal.message")}
        </Text>

        <Text className="text-sm font-semibold mb-1.5 tracking-wide text-text">
          {t("DeleteModal.confirmLabel", { username })}
        </Text>

        <View className="rounded-xl border mb-5 bg-foreground border-primaryDark">
          <TextInput
            className="h-[46px] px-4 text-base text-text"
            placeholder={username}
            placeholderTextColor={COLORS.textSub}
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View className="gap-[10px]">
          <TouchableOpacity
            className={`h-[48px] rounded-[12px] justify-center items-center bg-coral ${
              canConfirm ? "opacity-100" : "opacity-40"
            }`}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.foreground} />
            ) : (
              <Text className="text-foreground text-[16px] font-bold">
                {t("DeleteModal.confirm")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="h-[48px] rounded-[12px] justify-center items-center bg-backgroundDark"
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text className="text-textSub text-[16px] font-bold">
              {t("common.cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ModalShell>
  );
}
