import { useRecordsSync } from "@/src/active/hooks/records/useRecordsSync";
import { RecordOrSkeleton, RecordType } from "@/src/active/types/record";
import {
  Agehama,
  Board,
  BoardSize,
  generateTerritoryBoard,
  MatchType,
  movesToFinalBoard,
  TerritoryBoard,
} from "expo-goband";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
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
  finalBoard: Board;
  territoryBoard: TerritoryBoard;
  matchType: MatchType;
  agehama: Agehama;
};

// 🐱 レンダーに使う「見た目のデータ」だけをここに持たせる
type BoardCache = {
  records: RecordOrSkeleton[];
  processedRecords: Record<string, ProcessedRecord>;
  currentIndex: number;
  hasMore: boolean;
};

const FETCH_NUM = 30;

function makeInitialCache(): BoardCache {
  return {
    records: makeSkeletonCard(FETCH_NUM),
    processedRecords: {},
    currentIndex: 0,
    hasMore: true,
  };
}

export function useRecordsScreen() {
  const { uid } = useProfile();
  const { syncNewer, fetchOlderPage } = useRecordsSync();
  const { width, height } = useWindowDimensions();
  const aspectRatio = height / width;
  const heightRatio = 1 - aspectRatio * 0.24;

  const CARD_HEIGHT = PixelRatio.roundToNearestPixel(height * heightRatio);
  const SNAP_INTERVAL = CARD_HEIGHT + 18;

  const [isLoading, setIsLoading] = useState(true);
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const boardSizeRef = useRef<BoardSize>(9);

  // 🐱 盤サイズ→表示用データ の辞書。BOARD_SIZE_OPTIONSがいくつ増えても自動対応
  const [caches, setCaches] = useState<Partial<Record<BoardSize, BoardCache>>>(
    () => ({ 9: makeInitialCache() }),
  );

  // 🐱 現在の盤サイズのキャッシュ（レンダー中はstateから読むだけなのでOK）
  const cache = caches[boardSize] ?? makeInitialCache();
  const { records, processedRecords, currentIndex, hasMore } = cache;

  // 🐱 レンダーに使わない制御フラグは ref でOK（イベント/effect内でしか触らない）
  const initializedRef = useRef<Partial<Record<BoardSize, boolean>>>({});
  const isFetchingMoreRef = useRef<Partial<Record<BoardSize, boolean>>>({});
  const flatListRef = useRef<FlatList>(null);

  const updateCache = (bs: BoardSize, patch: Partial<BoardCache>) => {
    setCaches((prev) => ({
      ...prev,
      [bs]: { ...(prev[bs] ?? makeInitialCache()), ...patch },
    }));
  };

  // 🐱 initialScrollIndexはマウント時にしか効かないので、切り替え時は手動でスクロール
  const restoreScrollPosition = (index: number) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: SNAP_INTERVAL * index,
        animated: false,
      });
    });
  };

  const handleToggle = (newBoardSize: BoardSize) => {
    if (newBoardSize === boardSizeRef.current) return;

    setBoardSize(newBoardSize);
    boardSizeRef.current = newBoardSize;

    // 🐱 その盤サイズで以前見ていた位置（未訪問なら0）に復元
    restoreScrollPosition(caches[newBoardSize]?.currentIndex ?? 0);
  };

  const processRecords = useCallback(
    (list: RecordType[], targetBoardSize: BoardSize) => {
      const merged: Record<string, ProcessedRecord> = {};

      list.forEach((record) => {
        const moves = record.moves ?? [];
        const deadStones = record.dead_stones;

        const { board: finalBoard, agehama } = movesToFinalBoard(
          targetBoardSize,
          record.match_type,
          moves,
        );

        const territoryBoard = deadStones
          ? generateTerritoryBoard(
              targetBoardSize,
              finalBoard,
              deadStones,
              record.match_type,
              0,
              0,
            ).territoryBoard
          : Array.from({ length: targetBoardSize }, () =>
              Array(targetBoardSize).fill(0),
            );

        merged[record.id] = {
          finalBoard,
          territoryBoard,
          matchType: record.match_type,
          agehama,
        };
      });

      setCaches((prev) => {
        const prevCache = prev[targetBoardSize] ?? makeInitialCache();
        return {
          ...prev,
          [targetBoardSize]: {
            ...prevCache,
            processedRecords: { ...prevCache.processedRecords, ...merged },
          },
        };
      });
    },
    [],
  );

  // ---- 初回 / 盤サイズ切り替え時のロード ----
  useEffect(() => {
    if (!uid) return;

    const targetBoardSize = boardSize;

    // 🐱 その盤サイズで読み込み済みならスキップ（＝キャッシュから即復元されるだけ）
    if (initializedRef.current[targetBoardSize]) return;

    let isMounted = true;

    const init = async () => {
      setIsLoading(true);

      try {
        await syncNewer(uid, targetBoardSize);
        if (!isMounted) return;

        const page = await fetchOlderPage(
          uid,
          targetBoardSize,
          null,
          FETCH_NUM,
        );
        if (!isMounted) return;

        if (page.length === 0) {
          updateCache(targetBoardSize, { records: [] });
        } else {
          processRecords(page, targetBoardSize);
          if (!isMounted) return;
          updateCache(targetBoardSize, { records: page });
        }
        updateCache(targetBoardSize, {
          hasMore: page.length === FETCH_NUM,
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          initializedRef.current[targetBoardSize] = true;
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [boardSize, uid, syncNewer, fetchOlderPage, processRecords]);

  // ---- 追加読み込み (loadMore) ----
  const loadMore = () => {
    const targetBoardSize = boardSizeRef.current;
    if (!hasMore || isFetchingMoreRef.current[targetBoardSize] || !uid) return;
    isFetchingMoreRef.current[targetBoardSize] = true;

    const realRecords = records.filter(
      (r): r is RecordType => !isSkeletonCard(r),
    );
    const oldestId = realRecords.at(-1)?.id ?? null;

    updateCache(targetBoardSize, {
      records: [
        ...records.filter((r) => !isSkeletonCard(r)),
        ...makeSkeletonCard(FETCH_NUM),
      ],
    });

    fetchOlderPage(uid, targetBoardSize, oldestId, FETCH_NUM)
      .then((fetched) => {
        processRecords(fetched, targetBoardSize);

        setCaches((prev) => {
          const prevCache = prev[targetBoardSize] ?? makeInitialCache();
          const real = prevCache.records.filter(
            (r): r is RecordType => !isSkeletonCard(r),
          );
          return {
            ...prev,
            [targetBoardSize]: {
              ...prevCache,
              records: [...real, ...fetched],
              hasMore: fetched.length === FETCH_NUM,
            },
          };
        });
      })
      .catch((e) => console.error(e))
      .finally(() => {
        isFetchingMoreRef.current[targetBoardSize] = false;
      });
  };

  // スクロール
  const handleScroll = ({
    nativeEvent: e,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.contentOffset.y / SNAP_INTERVAL);
    if (index >= 0 && index !== currentIndex) {
      updateCache(boardSizeRef.current, { currentIndex: index });
    }

    const distanceFromBottom =
      e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height;
    if (distanceFromBottom < SNAP_INTERVAL * 1.5) {
      loadMore();
    }
  };

  return {
    uid,
    isLoading,
    records,
    processedRecords,
    boardSize,
    boardSizeRef,
    CARD_HEIGHT,
    SNAP_INTERVAL,
    currentIndex,
    hasMore,
    flatListRef,
    handleToggle,
    loadMore,
    handleScroll,
  };
}
