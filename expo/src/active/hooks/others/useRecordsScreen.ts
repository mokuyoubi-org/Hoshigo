// ✅active
// useRecordsScreen.ts

import { RecordOrSkeleton, RecordType } from "@/src/active/types/record";
import { supabase } from "@/src/stable/services/supabase/supabase";
import {
  Agehama,
  Board,
  BoardSize,
  generateTerritoryBoard,
  Grid,
  MatchType,
  movesToBoardHistory,
  TerritoryBoard,
} from "expo-goband";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  useWindowDimensions,
} from "react-native";
import {
  isSkeletonCard,
  makeSkeletonCard,
} from "../../../stable/logics/recordCardLogics";
import { useProfile } from "../../contexts/ProfileContexts";

export type ProcessedRecord = {
  boardHistory: Board[];
  moves: Grid[];
  agehamaHistory: Agehama[];
  territoryBoard: TerritoryBoard;
  matchType: MatchType;
};

export function useRecordsScreen() {
  // グローバルstate
  const { uid } = useProfile();
  const { width, height } = useWindowDimensions();

  // 1. 画面の縦横比（高さ ÷ 幅）を出す
  const aspectRatio = height / width;

  // 2. 縦横比に応じて割合を計算する
  const rawRatio = 0.9 - aspectRatio * 0.18;

  // 3. 割合が大きすぎたり小さすぎたりしないようにガード（60%〜80%の間に収める）する
  const heightRatio = Math.min(Math.max(rawRatio, 0.6), 0.8);

  // 4. 計算した割合で高さを決める
  const CARD_HEIGHT = PixelRatio.roundToNearestPixel(height * heightRatio);
  const SNAP_INTERVAL = CARD_HEIGHT + 18;
  const FETCH_NUM = 10;

  // state
  // 一番最初の時点で、skeletoncardが10対配置されているのだ。
  const [records, setRecords] = useState<RecordOrSkeleton[]>(
    makeSkeletonCard(FETCH_NUM),
  );
  const [hasMore, setHasMore] = useState(true);
  const [processedRecords, setProcessedRecords] = useState<
    Record<string, ProcessedRecord>
  >({});

  const isFetchingMore = useRef(false); // 今データを取りに行ってる最中かどうか。
  const processTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]); // ← 追加：進行中のタイマーを保持

  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const boardSizeRef = useRef<BoardSize>(9);

  const handleToggle = (boardSize: BoardSize) => {
    setBoardSize(boardSize);
    boardSizeRef.current = boardSize;
  };

  // ---- recordの情報から、操作可能な形に処理する。 ----
  const processRecords = useCallback((list: RecordType[]) => {
    list.forEach((record, i) => {
      const timer = setTimeout(() => {
        // ← timer を変数に保持
        const moves = record.moves;
        const deadStones = record.dead_stones;
        const { boardHistory, agehamaHistory } = movesToBoardHistory(
          boardSizeRef.current,
          record.match_type,
          moves ?? [],
        );
        const territoryBoard = deadStones
          ? generateTerritoryBoard(
              boardSizeRef.current,
              boardHistory.at(-1)!,
              deadStones,
              record.match_type,
              0,
              0,
            ).territoryBoard
          : Array.from({ length: boardSizeRef.current }, () =>
              Array(boardSizeRef.current).fill(0),
            );

        setProcessedRecords((p) => ({
          ...p,
          [record.id]: {
            boardHistory,
            moves,
            agehamaHistory,
            territoryBoard,
            matchType: record.match_type,
          },
        }));
      }, i * 50);
      processTimersRef.current.push(timer); // ← 追加
    });
  }, []);

  // ---- アンマウント時に、まだ実行されていないタイマーを全部止める ----
  useEffect(() => {
    return () => {
      processTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // fetchRecords本体
  const fetchRecords = useCallback(
    async (offset: number) => {
      if (!uid) return;
      try {
        // 要は、まず10件取ってくる。みんな共通で、このページを開いた瞬間。
        const { data, error } = await supabase.rpc(
          "get_records_with_profiles",
          {
            p_uid: uid,
            p_limit: FETCH_NUM,
            p_offset: offset,
            p_board_size: boardSizeRef.current,
          },
        );

        // エラーならこれで処理おしまい
        if (error) {
          console.error(error);
          isFetchingMore.current = false;
          return;
        }

        const fetched = data ?? []; // 取得したデータ。
        const isFirst = offset === 0; // 今回が最初のフェッチかどうか。
        const reachedEnd = fetched.length < FETCH_NUM; // 10個とりに行ったのにlengthが10未満ということはデータの最後に達した。

        if (isFirst && fetched.length === 0) {
          // 初めてのフェッチで、かつ何も取ってこなかったということは、まだ一局も打っていないということ。
          setRecords([]); // 棋譜は当然空っぽ。
        } else {
          // そうでなければ何かしらのデータはある
          // filter に型ガードを効かせて real を RecordType[] として確定させる
          setRecords((prev) => {
            const real = prev.filter(
              (r): r is RecordType => !isSkeletonCard(r),
            );
            return isFirst ? fetched : [...real, ...fetched];
          });
          processRecords(fetched);
        }

        setHasMore(!reachedEnd); // 終わりに達していないなら、まだ取ってこれる
      } catch (e) {
        console.error(e);
      } finally {
        isFetchingMore.current = false;
      }
    },
    [uid, processRecords],
  );

  // 一番最初にやること: fetchRecords
  useEffect(() => {
    if (!uid) return;

    let isMounted = true;

    const init = async () => {
      setRecords(makeSkeletonCard(FETCH_NUM)); // ← サイズ切替時にスケルトンに戻す
      setProcessedRecords({}); // ← 前サイズの処理済みデータをクリア
      if (isMounted) {
        await fetchRecords(0);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [boardSize, uid, fetchRecords]);

  // ---- 棋譜を追加で読み込む ----
  const loadMore = () => {
    if (!hasMore || isFetchingMore.current) return;
    isFetchingMore.current = true;
    const realCount = records.filter(
      (r): r is RecordType => !isSkeletonCard(r),
    ).length;
    setRecords((prev) => [
      ...prev.filter((r) => !isSkeletonCard(r)),
      ...makeSkeletonCard(FETCH_NUM),
    ]);
    fetchRecords(realCount);
  };

  // ---- スクロールした時の処理 ----
  const handleScroll = ({
    nativeEvent: e,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const distanceFromBottom =
      e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height;
    if (distanceFromBottom < SNAP_INTERVAL * 1.5) {
      loadMore();
    }
  };

  return {
    uid,
    records,
    processedRecords,
    boardSize,
    boardSizeRef,
    CARD_HEIGHT,
    SNAP_INTERVAL,
    handleToggle,
    loadMore,
    handleScroll,
  };
}
