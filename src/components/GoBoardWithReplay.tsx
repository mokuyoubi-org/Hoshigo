import React from "react";
import { StyleSheet, View } from "react-native";
import { Board, Grid } from "../lib/goLogics";
import { GoBoard } from "./GoBoard";
import { ReplayControls } from "./ReplayControls";
import { Agehama } from "../constants/goConstants";

interface GoBoardWithReplayProps {
  matchType: number;
  // 盤面関連
  board: Board;
  onPutStone: (grid: Grid) => void;
  moveHistory?: string[];
  territoryBoard?: number[][];
  disabled?: boolean;

  // ゲーム状態
  isGameEnded: boolean;

  // リプレイ関連
  boardHistory: Board[]; // 盤面の履歴
  currentIndex: number;
  onCurrentIndexChange: (newIndex: number) => void;

  // オプション
  boardBackgroundColor?: string;
  lineColor?: string;
  stoneShadow?: boolean;
  agehamaHistory: Agehama[];
}

export const GoBoardWithReplay: React.FC<GoBoardWithReplayProps> = ({
  matchType,
  board,
  onPutStone,
  moveHistory = [],
  territoryBoard,
  disabled = false,
  isGameEnded,
  boardHistory,
  currentIndex: currentIndex,
  onCurrentIndexChange: onReplayIndexChange,
  stoneShadow,
  agehamaHistory,
}) => {
  // 表示する盤面を決定
  const displayBoard = isGameEnded ? boardHistory[currentIndex] : board;

  // 陣地を表示するかどうか（リプレイの最後のみ）
  const showTerritory = isGameEnded && currentIndex === boardHistory.length - 1;

  // 一つ前に戻るボタンを押した時の処理
  const handlePrevious = () => {
    if (currentIndex > 0) {
      onReplayIndexChange(currentIndex - 1);
    }
  };
  // 一つ次に進むボタンを押した時の処理
  const handleNext = () => {
    if (currentIndex < boardHistory.length - 1) {
      onReplayIndexChange(currentIndex + 1);
    }
  };
  // スライダーを動かした時の処理
  const handleSliderChange = (value: number) => {
    onReplayIndexChange(Math.round(value));
  };

  return (
    <View style={styles.container}>
      {/* 碁盤 */}
      <GoBoard
      matchType={matchType}
      topBar={true}
        currentIndex={currentIndex} // 🌟
        board={displayBoard} // 🌟
        onPutStone={onPutStone} // 🌟
        moveHistory={moveHistory}
        territoryBoard={territoryBoard}
        showTerritory={showTerritory}
        disabled={disabled || isGameEnded}
        stoneShadow={stoneShadow}
        agehamaHistory={agehamaHistory} // 🌟
      />

      {/* リプレイコントロール（終局後のみ表示） */}
      {isGameEnded && (
        <ReplayControls
          currentIndex={currentIndex}
          maxIndex={boardHistory.length - 1}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSliderChange={handleSliderChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
  },
});
