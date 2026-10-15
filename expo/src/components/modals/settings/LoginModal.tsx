// LoginModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useLoginModal } from "@/src/hooks/modals/useLoginModal";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalShell } from "ui-atoms";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const LoginModal = ({ visible, onClose }: Props) => {
  const colors = useColors();
  const { t, error, loading, onSignInWithGoogle, onCancel } = useLoginModal({
    onClose,
  });

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
        <View className="flex-row justify-between items-center mb-4">
          <MyText className="text-2xl tracking-wider flex-1 text-text">
            {t("LoginModal.titleEmail")}
          </MyText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {error ? (
              <MyText className="text-lg text-center mb-3 text-failure">
                {error}
              </MyText>
            ) : null}

            <View className="gap-3 mt-2">
              {/* Googleでログインボタン */}
              <TouchableOpacity
                className="h-14 rounded-xl justify-center items-center bg-blackStone"
                activeOpacity={0.8}
                onPress={onSignInWithGoogle}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.foreground} />
                ) : (
                  <MyText className="text-lg tracking-wide text-foreground font-bold">
                    {t("LoginModal.googleSignIn")}
                  </MyText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="h-14 rounded-xl justify-center items-center bg-backgroundStrong"
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.8}
              >
                <MyText className="text-lg tracking-wide text-textSub">
                  {t("common.cancel")}
                </MyText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalShell>
  );
};
