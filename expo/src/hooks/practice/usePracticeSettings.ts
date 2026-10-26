// usePracticeSettings.ts
//
// 対局が始まる「前」の設定（盤サイズ・ハンデ・プレイヤー選択）を
// KVStorageで永続化しつつ管理するフック。プレビュー盤面の表示や
// セットアップモーダルへの値渡しに使う。
// 🌟実際の対局中の状態はここには含めない。

import { isOnlineBoardSize, useProfile } from "@/src/contexts/ProfileContexts";
import { PlayerType } from "@/src/types/player";
import { BoardSize, MatchType } from "go-core";
import { useKVStorage } from "kv-store";

export const usePracticeSettings = () => {
  const { stats, iconIndex, uid } = useProfile();

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

  // 5路はオンライン成績がないので 0。まだ読み込み前(null)のときも 0
  const myRatingForBoardSize = isOnlineBoardSize(boardSize)
    ? (stats[boardSize].rating ?? 0)
    : 0;
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
