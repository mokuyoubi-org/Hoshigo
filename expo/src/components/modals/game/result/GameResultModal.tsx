// GameResultModal.tsx

import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import {
  resultToObjectiveComment,
  resultToPlayerWin,
  resultToSubjectiveComment,
} from "@/src/logics/format/textFormatter";
import { FromType } from "@/src/types/from";
import { BoardSize, Color, Grid, MatchType, RecordAnalysis } from "go-core";
import { View } from "react-native";
import { ModalShell } from "ui-atoms";
import { MyText } from "../../../common/MyText";
import { MatchResultContent } from "./MatchResultContent";
import { PracticeResultContent } from "./PracticeResultContent";

type Props = {
  visible: boolean;
  analysis?: RecordAnalysis;
  // "B+4.5" のような生の結果。結果なし(途中終了など)は null / undefined
  result?: string | null;
  // 自分が対局者(人間 vs bot)のときだけ渡す。あれば「あなたの勝ち」の文と勝敗の色になる
  playerColor?: Color;
  onClose: () => void;
  ratingBefore: number;
  ratingAfter: number;
  rankIndexBefore: number;
  rankIndexAfter: number;
  boardSize: BoardSize;
  matchType: MatchType;
  moves: Grid[];
  from: FromType;
};

export const GameResultModal = (props: Props) => {
  const colors = useColors();
  const t = useTranslation();
  const { visible, result, playerColor, onClose, from } = props;

  // 文章への変換は、ここだけでやる
  const resultComment = !result
    ? t("common.matchComplete")
    : (playerColor !== undefined
        ? resultToSubjectiveComment(result, playerColor, t)
        : resultToObjectiveComment(result, t)) || t("common.matchComplete");

  const playerWin =
    playerColor === undefined
      ? undefined
      : resultToPlayerWin(result, playerColor);

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
        <MyText className="my-4 text-2xl text-center" style={{ color: textColor }}>
          {resultComment}
        </MyText>

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