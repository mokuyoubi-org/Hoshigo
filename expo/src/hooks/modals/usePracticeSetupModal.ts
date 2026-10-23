// usePracticeSetupModal.ts
//
// PracticeSetupModal（対局前の設定画面）が必要とする「画面表示用に
// 加工済みのデータ」を組み立てるフック。盤サイズ・ハンデ・プレイヤー選択
// に関する判定ロジックをここに集約し、モーダル側は受け取った値を
// そのまま描画するだけにする。

import {
  BOT_STATS,
  BOT_USERNAMES,
  BotUsername,
} from "@/src/constants/botProfiles";
import { PlayerType } from "@/src/types/player";
import { BoardSize, MatchType } from "go-core";
import { useEffect } from "react";

const ALL_MATCH_TYPES: MatchType[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 25];

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
};

export const usePracticeSetupModal = ({
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
}: UsePracticeSetupArgs) => {
  const handicapOptions = ALL_MATCH_TYPES.filter(
    (type) => type <= getMaxHandicap(boardSize),
  );
  const handicapIndex = handicapOptions.indexOf(matchType);
  const isHandicapAtMin = handicapIndex <= 0;
  const isHandicapAtMax = handicapIndex >= handicapOptions.length - 1;

  // 「you」が選ばれている側は、親から届く最新の myRating などに追従させる。
  // 盤サイズ変更の直後は myRating がまだ古いので、selectBoardSize 内では
  // 更新できない。新しい値が届いてから貼り替える。
  // すでに最新なら何もしないので、無限ループにはならない。
  useEffect(() => {
    const syncYou = (
      player: PlayerType,
      setPlayer: (v: PlayerType) => void,
    ) => {
      if (player.username !== "you") return;
      if (
        player.rating === myRating &&
        player.iconIndex === myIconIndex &&
        player.uid === myUid
      ) {
        return;
      }
      setPlayer({
        ...player,
        rating: myRating,
        iconIndex: myIconIndex,
        uid: myUid,
      });
    };
    syncYou(blackPlayer, setBlackPlayer);
    syncYou(whitePlayer, setWhitePlayer);
  }, [
    myRating,
    myIconIndex,
    myUid,
    blackPlayer,
    whitePlayer,
    setBlackPlayer,
    setWhitePlayer,
  ]);

  // 盤サイズを変更する。ハンデが新しい盤サイズの上限を超えていたらリセットする。
  const selectBoardSize = (size: BoardSize) => {
    setBoardSize(size);

    // matchTypeが新しい上限を超えていたら0（互先）にリセット！
    if (matchType > getMaxHandicap(size)) setMatchType(0);

    // Botが選ばれている側は、新しい盤サイズでのレートに更新する。
    // ("you" 側は、上の useEffect が最新の myRating などに追従させる)
    const updateBotRating = (
      player: PlayerType,
      setPlayer: (v: PlayerType) => void,
    ) => {
      if (player.username === "you") return;
      setPlayer({
        ...player,
        rating:
          BOT_STATS[player.username as BotUsername]?.ratingByBoardSize[size] ??
          0,
      });
    };
    updateBotRating(blackPlayer, setBlackPlayer);
    updateBotRating(whitePlayer, setWhitePlayer);
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
    },
    ...BOT_USERNAMES.map((botUsername): PlayerSelectOption => {
      const player: PlayerType = {
        username: botUsername,
        rating: BOT_STATS[botUsername]?.ratingByBoardSize[boardSize] ?? 0,
        iconIndex: BOT_STATS[botUsername]?.iconIndex ?? 0,
      };
      return {
        player,
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
};
