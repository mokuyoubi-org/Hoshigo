// usePracticeSettings.ts
//
// 対局が始まる「前」の設定（盤サイズ・ハンデ・プレイヤー選択）を
// KVStorageで永続化しつつ管理するフック。プレビュー盤面の表示や
// セットアップモーダルへの値渡しに使う。
// 🌟実際の対局中の状態(useGoGame等)はここには一切含めない。
// 含めてしまうと、ユーザーが設定を変更している最中にも
// useGoGameが古い初期値を握ったまま更新されない、という不具合の
// 原因になるため。

import { BoardSize, MatchType } from "go-core";
import { useKVStorage } from "storage-kit";
import { useProfile } from "../../contexts/ProfileContexts";
import { PlayerType } from "./usePracticeSession";

export function usePracticeSettings() {
  const { rating9, rating13, rating19, iconIndex, uid } = useProfile();

  const myRating = (boardSize: BoardSize) => {
    if (boardSize === 9) return rating9;
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

  const {
    value: boardSize,
    setValue: setBoardSize,
    isLoaded: isBoardSizeLoaded,
  } = useKVStorage<BoardSize>("PracticeGameScreen.boardSize", 9);

  const {
    value: matchType,
    setValue: setMatchType,
    isLoaded: isMatchTypeLoaded,
  } = useKVStorage<MatchType>("PracticeGameScreen.matchType", 0);

  const {
    value: blackPlayer,
    setValue: setBlackPlayer,
    isLoaded: isBlackPlayerLoaded,
  } = useKVStorage<PlayerType>("PracticeGameScreen.blackPlayer", {
    username: "you",
    rating: myRating(boardSize) ?? 0,
    iconIndex: iconIndex ?? 0,
    uid: uid ?? "",
  });

  const {
    value: whitePlayer,
    setValue: setWhitePlayer,
    isLoaded: isWhitePlayerLoaded,
  } = useKVStorage<PlayerType>("PracticeGameScreen.whitePlayer", {
    username: "you",
    rating: myRating(boardSize) ?? 0,
    iconIndex: iconIndex ?? 0,
    uid: uid ?? "",
  });

  const isLoaded =
    isBoardSizeLoaded &&
    isMatchTypeLoaded &&
    isBlackPlayerLoaded &&
    isWhitePlayerLoaded;

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
    isLoaded,
    isSoundEnabled,
    doubleTap,
    myRatingForBoardSize,
    myIconIndex,
    uid,
  };
}
