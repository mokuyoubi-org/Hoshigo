// usePracticeSetup.ts
//
// PracticeSetupModal（対局前の設定画面）が必要とする「画面表示用に
// 加工済みのデータ」を組み立てるフック。盤サイズ・ハンデ・プレイヤー選択
// に関する判定ロジックをここに集約し、モーダル側は受け取った値を
// そのまま描画するだけにする。

import {
  BOT_MODEL_ID,
  BOT_STATS,
  BOT_USERNAMES,
  BotUsername,
  getBotProfile,
} from "@/src/active/constants/botProfiles";
import { useKataGoEngine } from "expo-katago";
import { BoardSize, MatchType } from "go-core";
import { PlayerType } from "./usePracticeSession";

const ALL_MATCH_TYPES: MatchType[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 16, 25];

export const getMaxHandicap = (size: BoardSize): number => {
  switch (size) {
    case 5:
      return 1; // 定先まで
    case 9:
      return 5; // 5子局まで
    case 13:
      return 9; // 9子局まで
    case 19:
      return 25; // 25子局まで
  }
};

export type PlayerSelectOption = {
  player: PlayerType;
  isLocked: boolean;
  // botの場合のみ意味を持つ。人間の場合は常に "ready"
  statusPhase: string;
  onPress: () => void;
};

type UsePracticeSetupArgs = {
  boardSize: BoardSize;
  setBoardSize: (v: BoardSize) => void;
  matchType: MatchType;
  setMatchType: (v: MatchType) => void;
  blackPlayer: PlayerType;
  setBlackPlayer: (v: PlayerType) => void;
  whitePlayer: PlayerType;
  setWhitePlayer: (v: PlayerType) => void;
  myRating: number;
  myIconIndex: number;
  myUid: string;
  // ロック中のbotが選択されたときに呼ばれる。フェーズが何であれ(未DL/DL中/
  // ウォームアップ中)呼ばれ、どの表示を出すかはガードモーダル自身が
  // getModelStatusを見て判断する。呼び出し元(コンポーネント)はモーダルを
  // 出すことだけを担う。
  onRequestDownload: () => void;
};

export function usePracticeSetup({
  boardSize,
  setBoardSize,
  matchType,
  setMatchType,
  blackPlayer,
  setBlackPlayer,
  whitePlayer,
  setWhitePlayer,
  myRating,
  myIconIndex,
  myUid,
  onRequestDownload,
}: UsePracticeSetupArgs) {
  const { getModelStatus } = useKataGoEngine();

  const handicapOptions = ALL_MATCH_TYPES.filter(
    (type) => type <= getMaxHandicap(boardSize),
  );
  const handicapIndex = handicapOptions.indexOf(matchType);
  const isHandicapAtMin = handicapIndex <= 0;
  const isHandicapAtMax = handicapIndex >= handicapOptions.length - 1;

  // 盤サイズを変更する。ハンデが新しい盤サイズの上限を超えていたらリセットする。
  const selectBoardSize = (size: BoardSize) => {
    setBoardSize(size);
    const nextMax = getMaxHandicap(size);
    if (matchType > nextMax + 1) setMatchType(0);

    // 黒プレイヤーがBotの場合、新しい盤サイズのレートとUIDに更新する
    if (blackPlayer.username !== "you") {
      const botUsername = blackPlayer.username as BotUsername; // ← ここで型キャスト！
      setBlackPlayer({
        ...blackPlayer,
        rating: BOT_STATS[botUsername]?.ratingByBoardSize[size] ?? 0,
        uid: getBotProfile(botUsername, size).uid,
      });
    }

    // 白プレイヤーがBotの場合、新しい盤サイズのレートとUIDに更新する
    if (whitePlayer.username !== "you") {
      const botUsername = whitePlayer.username as BotUsername; // ← ここで型キャスト！
      setWhitePlayer({
        ...whitePlayer,
        rating: BOT_STATS[botUsername]?.ratingByBoardSize[size] ?? 0,
        uid: getBotProfile(botUsername, size).uid,
      });
    }
  };

  const selectPreviousHandicap = () => {
    if (handicapIndex > 0) setMatchType(handicapOptions[handicapIndex - 1]);
  };

  const selectNextHandicap = () => {
    if (handicapIndex < handicapOptions.length - 1) {
      setMatchType(handicapOptions[handicapIndex + 1]);
    }
  };

  // 選択肢となるプレイヤー一覧。botはダウンロード状況によるロックも一緒に計算しておく。
  const playerOptions: PlayerSelectOption[] = [
    {
      player: {
        username: "you",
        rating: myRating,
        iconIndex: myIconIndex,
        uid: myUid,
      },
      isLocked: false,
      statusPhase: "ready",
      onPress: () => {},
    },
    ...BOT_USERNAMES.map((botUsername): PlayerSelectOption => {
      const status = getModelStatus(BOT_MODEL_ID[botUsername]);
      const isLocked = status.phase !== "ready";
      const player: PlayerType = {
        username: botUsername,
        rating: BOT_STATS[botUsername]?.ratingByBoardSize[boardSize] ?? 0,
        iconIndex: BOT_STATS[botUsername]?.iconIndex ?? 0,
        uid: getBotProfile(botUsername, boardSize).uid,
      };
      return {
        player,
        isLocked,
        statusPhase: status.phase,
        onPress: () => {
          if (isLocked) {
            // フェーズが何であれ(未DL/DL中/ウォームアップ中)ガードモーダルを
            // 出す。どの表示になるかはモーダル自身が判断する。
            onRequestDownload();
            return;
          }
        },
      };
    }),
  ];

  return {
    handicapOptions,
    handicapIndex,
    isHandicapAtMin,
    isHandicapAtMax,
    selectBoardSize,
    selectPreviousHandicap,
    selectNextHandicap,
    playerOptions,
  };
}
