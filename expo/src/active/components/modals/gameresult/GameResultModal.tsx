// GameResultModal.tsx

import { useColors } from "@/src/active/hooks/useTheme";
import { BoardSize } from "go-core";
import React from "react";
import { View } from "react-native";
import { ModalShell } from "ui-atoms";
import { FromType } from "../../../types/from";
import { AppText } from "../../common/AppText";
import { MatchResultContent } from "./MatchResultContent";
import { PracticeResultContent } from "./PracticeResultContent";

type Props = {
  visible: boolean;
  resultComment?: string;
  onClose: () => void;
  ratingBefore: number;
  ratingAfter: number;
  rankIndexBefore: number;
  rankIndexAfter: number;
  boardSize: BoardSize;
  from: FromType;
  giantKillingStreak: number;
  giantKillingBonus: boolean;
};

export function GameResultModal(props: Props) {
  const colors = useColors();
  const { visible, resultComment, onClose, from } = props;

  if (!visible) return null;

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      backgroundColor={colors.foreground}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
    >
      <View className="w-full items-center justify-center">
        {resultComment && (
          <AppText
            className="my-4 text-2xl text-center"
            style={{ color: colors.text }}
          >
            {resultComment}
          </AppText>
        )}

        {/* from によって表示する中身を完全に分ける */}
        {from === "GameScreen" ? (
          <MatchResultContent {...props} />
        ) : (
          <PracticeResultContent
            onClose={onClose}
            boardSize={props.boardSize}
          />
        )}
      </View>
    </ModalShell>
  );
}
