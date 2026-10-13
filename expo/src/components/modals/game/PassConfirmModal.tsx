// PassConfirmModal.tsx
//
// 終局していない局面で「パス」を押した時に出す確認モーダル。
//   「いいえ」→ 何もしない(手を打っていない状態のまま)
//   「はい」  → パスする
// モーダルの外をタップした時や、戻る操作も「いいえ」として扱う。

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";

type Props = {
  onYes: () => void;
  onNo: () => void;
};

export const PassConfirmModal = ({ onYes, onNo }: Props) => {
  const t = useTranslation();
  const colors = useColors();

  return (
    <ModalShell
      onClose={onNo}
      size={"md"}
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View>
        <View className="w-full items-center mb-3">
          <MyText className="text-lg text-text text-center">
            {t("common.passConfirm")}
          </MyText>
        </View>

        <View className="w-full gap-2 mt-2">
          <TouchableOpacity
            className="w-full h-12 rounded-xl justify-center items-center bg-blackStone"
            onPress={onYes}
            activeOpacity={0.8}
          >
            <MyText className="text-foreground text-xl">
              {t("common.yes")}
            </MyText>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full h-12 rounded-xl justify-center items-center bg-backgroundStrong"
            onPress={onNo}
            activeOpacity={0.8}
          >
            <MyText className="text-textSub text-xl">{t("common.no")}</MyText>
          </TouchableOpacity>
        </View>
      </View>
    </ModalShell>
  );
};
