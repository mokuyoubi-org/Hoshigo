// GameResultModal.tsx

import { COLORS } from "@/src/active/constants/colors";
import { BoardSize } from "go-core";
import React from "react";
import { Text, View } from "react-native";
import { ModalShell } from "ui-atoms";
import { FromType } from "../../../types/from";
import { GameResultContent } from "./GameResultContent";
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
  giantKillingStreakBonusApplied: boolean;
};

export function GameResultModal(props: Props) {
  const { visible, resultComment, onClose, from } = props;

  if (!visible) return null;

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      backgroundColor="#ffffff"
      style={{ padding: 20, alignItems: "center", justifyContent: "center" }}
    >
      <View className="w-full items-center justify-center">
        {resultComment && (
          <Text
            className="my-[12px] text-[20px] font-bold text-center"
            style={{ color: COLORS.text }}
          >
            {resultComment}
          </Text>
        )}

        {/* from によって表示する中身を完全に分ける */}
        {from === "GameScreen" ? (
          <GameResultContent {...props} />
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
