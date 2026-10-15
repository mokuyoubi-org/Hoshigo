// usePracticeSettings.ts
//
// 対局が始まる「前」の設定（盤サイズ・ハンデ・プレイヤー選択）を
// KVStorageで永続化しつつ管理するフック。プレビュー盤面の表示や
// セットアップモーダルへの値渡しに使う。
// 🌟実際の対局中の状態はここには含めない。

import { useProfile } from "@/src/contexts/ProfileContexts";
import { PlayerType } from "@/src/types/player";
import { BoardSize, MatchType } from "go-core";
import { useKVStorage } from "kv-store";

export const usePracticeSettings = () => {
  const { rating9, rating13, rating19, iconIndex, uid } = useProfile();

  const myRating = (boardSize: BoardSize) => {
    if (boardSize === 5) return 0;
    else if (boardSize === 9) return rating9;
    else if (boardSize === 13) return rating13;
    else return rating19;
  };

  const { value: isSoundEnabled } = useKVStorage<boolean>(
    "global.sound",
    false,
  );
  const { value: doubleTap9 } = useKVStorage<boolean>(
    "global.doubleTap9",
    false,
  );
  const { value: doubleTap13 } = useKVStorage<boolean>(
    "global.doubleTap13",
    true,
  );
  const { value: doubleTap19 } = useKVStorage<boolean>(
    "global.doubleTap19",
    true,
  );

  const { value: boardSize, setValue: setBoardSize } = useKVStorage<BoardSize>(
    "PracticeGameScreen.boardSize",
    9,
  );

  const { value: matchType, setValue: setMatchType } = useKVStorage<MatchType>(
    "PracticeGameScreen.matchType",
    0,
  );

  const { value: blackPlayer, setValue: setBlackPlayer } =
    useKVStorage<PlayerType>("PracticeGameScreen.blackPlayer", {
      username: "you",
      rating: 0,
      iconIndex: 0,
      uid: "",
    });

  const { value: whitePlayer, setValue: setWhitePlayer } =
    useKVStorage<PlayerType>("PracticeGameScreen.whitePlayer", {
      username: "you",
      rating: 0,
      iconIndex: 0,
      uid: "",
    });

  const doubleTap: boolean =
    boardSize === 9
      ? doubleTap9
      : boardSize === 13
        ? doubleTap13
        : boardSize === 19
          ? doubleTap19
          : false; // ⚠️⚠️⚠️⚠️これはつまり5路盤のこと！！！

  const myRatingForBoardSize = myRating(boardSize) ?? 0;
  const myIconIndex = iconIndex ?? 0;

  return {
    boardSize,
    setBoardSize,
    matchType,
    setMatchType,
    blackPlayer,
    setBlackPlayer,
    whitePlayer,
    setWhitePlayer,
    isSoundEnabled,
    doubleTap,
    myRatingForBoardSize,
    myIconIndex,
    uid,
  };
};
