// Hoshigo
// expo/src/hooks/tsumego/useTsumegoFeed.ts
// スワイプで解く詰碁の「問題のリスト」を管理するフック。
// 最初に10問もらい、残りが少なくなったら、裏で次の10問をもらって、後ろにつなげる。
// あわせて、結果(解けた/解けなかった/飛ばした)と、いいねをサーバーに送る。

import {
  fetchTsumegoBatch,
  setTsumegoLike,
  submitTsumegoResult,
  TsumegoHideSettings,
} from "@/src/logics/rpc/tsumegoRPC";
import { TsumegoType } from "@/src/types/tsumego";
import { BoardSize } from "go-core";
import { useKVStorage } from "kv-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { ViewToken } from "react-native";

// 残りがこの数以下になったら、次の問題を頼む(10問のうち、8問目を見た時)
const PREFETCH_REMAINING = 3;
// サーバーに「もう持っている問題」として送る数(サーバー側の上限は50)。新しい方から数える
const MAX_EXCLUDE = 50;

export const useTsumegoFeed = (boardSize: BoardSize) => {
  // 「出さない」設定(スマホの中に保存)。TsumegoSettingsModal と同じキーを見ている
  const { value: hideSkipped } = useKVStorage<boolean>(
    "TsumegoScreen.hideSkipped",
    false,
  );
  const { value: hideSolved } = useKVStorage<boolean>(
    "TsumegoScreen.hideSolved",
    true,
  );
  const { value: hideFailed } = useKVStorage<boolean>(
    "TsumegoScreen.hideFailed",
    false,
  );

  const [items, setItems] = useState<TsumegoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 非同期の処理から最新の値を読むための入れ物
  const itemsRef = useRef<TsumegoType[]>([]);
  const isFetchingRef = useRef(false);
  // もう問題が残っていない(サーバーが空っぽを返した)
  const isEndRef = useRef(false);
  const isMountedRef = useRef(true);
  const hideRef = useRef<TsumegoHideSettings>({
    skipped: false,
    solved: true,
    failed: false,
  });
  // 結果を送った(または飛ばしとして送った)問題のid。飛ばしを二重に送らないために使う
  const reportedIdsRef = useRef<Set<string>>(new Set());
  // いま見ている問題のid
  const viewedIdRef = useRef<string | null>(null);

  useEffect(() => {
    hideRef.current = {
      skipped: hideSkipped ?? false,
      solved: hideSolved ?? true,
      failed: hideFailed ?? false,
    };
  });

  // 次の10問を頼んで、リストの後ろにつなげる。頼んでいる最中・もう無い時は、何もしない
  const loadMore = async () => {
    if (isFetchingRef.current || isEndRef.current) return;
    isFetchingRef.current = true;
    setHasError(false);
    try {
      const excludeIds = itemsRef.current.slice(-MAX_EXCLUDE).map((p) => p.id);
      const batch = await fetchTsumegoBatch(
        boardSize,
        excludeIds,
        hideRef.current,
      );
      if (!isMountedRef.current) return;
      if (batch.length === 0) {
        isEndRef.current = true;
      } else {
        itemsRef.current = [...itemsRef.current, ...batch];
        setItems(itemsRef.current);
      }
    } catch (e) {
      console.warn("[useTsumegoFeed] 詰碁の取得に失敗", e);
      if (isMountedRef.current) setHasError(true);
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  // 「やり直す」ボタン用
  const retry = () => {
    if (itemsRef.current.length === 0) setIsLoading(true);
    loadMore();
  };

  // 解けた/解けなかったを送る。何度やり直しても、その都度、最後の結果として送る
  // (サーバー側が、「レートが動くのは初回だけ」を守ってくれる)
  const reportResult = (id: string, result: "solved" | "failed") => {
    reportedIdsRef.current.add(id);
    void submitTsumegoResult(id, result);
  };

  // リストの中の、1問分の「いいね」の見た目(いいね済みか・数)を書き換える
  const applyLike = (id: string, liked: boolean, likeCount: number) => {
    itemsRef.current = itemsRef.current.map((p) =>
      p.id === id ? { ...p, liked, like_count: likeCount } : p,
    );
    setItems(itemsRef.current);
  };

  // ハートを押した時。見た目をすぐ変えてから、サーバーに伝える。失敗したら、元に戻す
  const toggleLike = (id: string) => {
    const target = itemsRef.current.find((p) => p.id === id);
    if (!target) return;
    const nextLiked = !target.liked;
    applyLike(
      id,
      nextLiked,
      Math.max(target.like_count + (nextLiked ? 1 : -1), 0),
    );
    void setTsumegoLike(id, nextLiked).then((ok) => {
      if (!ok && isMountedRef.current) {
        applyLike(id, target.liked, target.like_count);
      }
    });
  };

  // 🌟最新のloadMoreを指すref。下のonViewableItemsChangedは、
  //   FlatListの決まりで「作り直してはいけない」ので、refごしに呼ぶ。
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // 開いたら、最初の10問を頼む
  useEffect(() => {
    isMountedRef.current = true;
    loadMore();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 画面に出ている問題が変わった時に呼ばれる。
  //   ・解かないまま離れた前の問題は、「飛ばした」として送る(1問につき1回だけ)
  //   ・残りが少なければ、次の10問を頼む
  // FlatListの決まりで「作り直してはいけない」ので、useCallbackで依存なし([])にしている
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const index = viewableItems[0]?.index;
      if (index == null) return;

      const currentId = itemsRef.current[index]?.id ?? null;
      const prevId = viewedIdRef.current;
      if (
        prevId !== null &&
        currentId !== null &&
        prevId !== currentId &&
        !reportedIdsRef.current.has(prevId)
      ) {
        reportedIdsRef.current.add(prevId);
        void submitTsumegoResult(prevId, "skipped");
      }
      if (currentId !== null) viewedIdRef.current = currentId;

      if (index >= itemsRef.current.length - PREFETCH_REMAINING) {
        loadMoreRef.current();
      }
    },
    [],
  );

  return {
    items,
    isLoading,
    hasError,
    retry,
    loadMore,
    onViewableItemsChanged,
    reportResult,
    toggleLike,
  };
};
