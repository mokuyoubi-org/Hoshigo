// GameResultModal.tsx

import { useColors } from "@/src/hooks/common/useTheme";
import { FromType } from "@/src/types/from";
import { BoardSize, Grid, MatchType, RecordAnalysis } from "go-core";
import { View } from "react-native";
import { ModalShell } from "ui-atoms";
import { MyText } from "../../../common/MyText";
import { MatchResultContent } from "./MatchResultContent";
import { PracticeResultContent } from "./PracticeResultContent";

type Props = {
  visible: boolean;
  analysis?: RecordAnalysis;
  resultComment?: string;
  onClose: () => void;
  ratingBefore: number;
  ratingAfter: number;
  rankIndexBefore: number;
  rankIndexAfter: number;
  boardSize: BoardSize;
  matchType: MatchType;
  moves: Grid[];
  from: FromType;
  giantKillingStreak: number | null; // 連勝が変わらなかった時は null
  playerWin?: boolean;
};

export const GameResultModal = (props: Props) => {
  const colors = useColors();
  const { visible, resultComment, onClose, from, playerWin } = props;

  const textColor =
    playerWin === true
      ? colors.success
      : playerWin === false
        ? colors.failure
        : colors.text;

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
          <MyText
            className="my-4 text-2xl text-center"
            style={{ color: textColor }}
          >
            {resultComment}
          </MyText>
        )}

        {/* from によって表示する中身を完全に分ける */}
        {from === "GameScreen" ? (
          <MatchResultContent {...props} />
        ) : (
          <PracticeResultContent
            onClose={onClose}
            boardSize={props.boardSize}
            matchType={props.matchType}
            moves={props.moves}
            analysis={props.analysis}
          />
        )}
      </View>
    </ModalShell>
  );
};
