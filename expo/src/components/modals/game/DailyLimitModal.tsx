// DailyLimitModal.tsx
//
// 匿名ユーザが、その盤面の1日の対局数の上限に達した時に出すモーダル。
//   「ログインする」→ このモーダルを閉じて LoginModal を表示
//   「キャンセル」  → このモーダルを閉じるだけ

import { MyText } from "@/src/components/common/MyText";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { LoginModal } from "../settings/LoginModal"; // ⚠️実際のパスに合わせてください

export const DailyLimitModal = () => {
  const t = useTranslation();
  const { show, hide } = useOverlay();
  const colors = useColors();

  const handleLogin = () => {
    hide();
    show(<LoginModal visible={true} onClose={hide} />);
  };

  return (
    <ModalShell
      onClose={hide}
      size={"md"}
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View>
        <View className="w-full items-center mb-3">
          <MyText className="text-lg text-text text-center">
            {t("matching.daily_limit_reached")}
          </MyText>
        </View>

        <View className="w-full gap-2 mt-2">
          <TouchableOpacity
            className="w-full h-12 rounded-xl justify-center items-center bg-blackStone"
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <MyText className="text-foreground text-xl">
              {t("common.login")}
            </MyText>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full h-12 rounded-xl justify-center items-center bg-backgroundStrong"
            onPress={hide}
            activeOpacity={0.8}
          >
            <MyText className="text-textSub text-xl">
              {t("common.cancel")}
            </MyText>
          </TouchableOpacity>
        </View>
      </View>
    </ModalShell>
  );
};
