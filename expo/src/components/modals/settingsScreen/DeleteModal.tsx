// DeleteModal.tsx

import { MixedText } from "@/src/components/common/MixedText";
import { MixedTextInput } from "@/src/components/common/MixedTextInput";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";

type Props = {
  username: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export const DeleteModal = ({ username, onConfirm, onCancel }: Props) => {
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
          <MyText className="text-2xl tracking-wide flex-1 text-failure">
            {t("DeleteModal.title")}
          </MyText>
        </View>

        <MyText className="text-lg mb-4 tracking-wide text-textSub">
          {t("DeleteModal.message")}
        </MyText>

        <MixedText className="text-base mb-2 tracking-wide text-text">
          {t("DeleteModal.confirmLabel", { username })}
        </MixedText>

        <View className="rounded-xl border border-2 mb-6 bg-foreground border-primaryStrong">
          <MixedTextInput
            className="h-14 px-4 text-xl text-text"
            placeholder={username}
            placeholderTextColor={colors.textOpacity} // 絵文字対策
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={{ includeFontPadding: false }} // ⚠️Android用。大事
          />
        </View>

        <View className="gap-2">
          <TouchableOpacity
            className={`h-14 rounded-xl justify-center items-center ${
              canConfirm ? "bg-failure" : "bg-failureLight"
            }`}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            {loading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <MyText className="text-foreground text-lg">
                {t("DeleteModal.confirm")}
              </MyText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="h-14 rounded-xl justify-center items-center bg-backgroundStrong"
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.8}
          >
            <MyText className="text-textSub text-lg">
              {t("common.cancel")}
            </MyText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ModalShell>
  );
};
