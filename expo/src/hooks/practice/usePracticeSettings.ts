// usePracticeSettings.ts
//
// 対局が始まる「前」の設定（盤サイズ・ハンデ・プレイヤー選択）を
// KVStorageで永続化しつつ管理するフック。プレビュー盤面の表示や
// セットアップモーダルへの値渡しに使う。
// 🌟実際の対局中の状態はここには含めない。

import { useProfile } from "@/src/contexts/ProfileContexts";
import { getMyRating } from "@/src/logics/rank/myRating";
import { PlayerType } from "@/src/types/player";
import { BoardSize, MatchType } from "go-core";
import { useKVStorage } from "kv-store";

export const usePracticeSettings = () => {
  const { rating9, rating13, rating19, iconIndex, uid } = useProfile();

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

  const myRatingForBoardSize = getMyRating(
    { rating9, rating13, rating19 },
    boardSize,
  );
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
    myRatingForBoardSize,
    myIconIndex,
    uid,
  };
};
