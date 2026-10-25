// LoginModal.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useLoginModal } from "@/src/hooks/modals/useLoginModal";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  ActivityIndicator,
  Image,
  Platform,
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
  const { t, error, loading, onSignInWithGoogle, onSignInWithApple, onCancel } =
    useLoginModal({
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
      <View className="flex-row justify-between items-center mb-4">
        <MyText className="text-2xl tracking-wider flex-1 text-text">
          {t("LoginModal.titleEmail")}
        </MyText>
      </View>

      <View>
        {error ? (
          <MyText className="text-lg text-center mb-3 text-failure">
            {error}
          </MyText>
        ) : null}

        <View className="gap-3 mt-2">
          {/* Appleでサインインボタン(iOSだけ。Appleの公式ボタン) */}
          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={8}
              style={{ width: "100%", height: 48 }}
              onPress={onSignInWithApple}
            />
          ) : null}

          {/* Googleでログインボタン(Google公式の見た目: 白い背景 + カラーのG) */}
          <TouchableOpacity
            className="h-14 rounded-xl flex-row justify-center items-center"
            style={{
              backgroundColor: colors.foreground,
              borderWidth: 2,
              borderColor: colors.backgroundStrong,
              paddingHorizontal: 16,
            }}
            activeOpacity={0.8}
            onPress={onSignInWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Image
                  source={require("../../../../assets/images/google-g.png")}
                  style={{ width: 32, height: 32, marginRight: 12 }}
                  resizeMode="contain"
                />
                <MyText className="text-lg tracking-wide font-bold text-text">
                  {t("LoginModal.googleSignIn")}
                </MyText>
              </>
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
    </ModalShell>
  );
};
