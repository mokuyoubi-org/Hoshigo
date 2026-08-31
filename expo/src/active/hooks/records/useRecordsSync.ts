import type { RecordType } from "@/src/active/types/record";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import { sqliteKv } from "@/src/stable/services/storage/sqlite";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { useCallback } from "react";

const SYNC_BATCH = 30; // 差分キャッチアップ1回あたりの取得件数

export function useRecordsSync() {
  // ---- 新着キャッチアップ ----
  const syncNewer = useCallback(async (uid: string, boardSize: number) => {
    const localNewestId = await recordsRepo.getNewestId(boardSize);
    if (localNewestId == null) return; // ローカルが空なら差分の概念がそもそも無い

    let cursor = localNewestId;
    while (true) {
      const { data, error } = await supabase.rpc("get_records_newer", {
        p_uid: uid,
        p_limit: SYNC_BATCH,
        p_board_size: boardSize,
        p_after_id: cursor,
      });
      if (error) {
        console.error("新着棋譜の取得失敗:", error);
        return;
      }
      const fetched: RecordType[] = data ?? [];
      if (fetched.length === 0) {
        console.log("新しいのは特になかったよ");
        return;
      }

      await recordsRepo.insertMany(fetched);
      cursor = fetched[fetched.length - 1].id;

      if (fetched.length < SYNC_BATCH) return;
    }
  }, []);

  // ---- ページ取得(表示用) ----
  const fetchOlderPage = useCallback(
    async (
      uid: string,
      boardSize: number,
      beforeId: number | null,
      limit: number,
    ): Promise<RecordType[]> => {
      // 1. ローカルから取得を試みる
      const localPage = await recordsRepo.getPage(boardSize, beforeId, limit);
      if (localPage.length >= limit) {
        console.log("ローカルだけで足りたよ");
        return localPage;
      }

      // 2. 「これ以上古い棋譜はない」と分かっているかチェックする！
      const oldestKey = `oldest_record_id_${boardSize}`;
      const knownOldestIdStr = await sqliteKv.getItem(oldestKey);

      if (knownOldestIdStr !== null) {
        const knownOldestId = JSON.parse(knownOldestIdStr) as number;
        const currentOldestInLocal =
          localPage.length > 0 ? localPage[localPage.length - 1].id : beforeId;

        // すでにローカルの最古IDがサーバの最古IDに到達しているなら、通信しない！
        if (
          currentOldestInLocal !== null &&
          currentOldestInLocal <= knownOldestId
        ) {
          console.log("すでにサーバの底まで取得済みだよ。通信スキップ");
          return localPage;
        }
      }

      // 3. ローカルで足りない分をサーバから補充する
      const fetchFromId =
        localPage.length > 0 ? localPage[localPage.length - 1].id : beforeId;
      const needCount = limit - localPage.length;

      console.log("サーバから取ってくるよ");
      const { data, error } = await supabase.rpc("get_records_older", {
        p_uid: uid,
        p_limit: needCount,
        p_board_size: boardSize,
        p_before_id: fetchFromId,
      });

      if (error) {
        console.error("過去棋譜の取得失敗:", error);
        return localPage;
      }

      const fetched: RecordType[] = data ?? [];

      // 4. サーバから取れた件数が要求より少ない＝「底に到達した」
      if (fetched.length < needCount) {
        // 今回取れた分も含めて、一番古いIDを確定させて保存する
        const finalOldestId =
          fetched.length > 0 ? fetched[fetched.length - 1].id : fetchFromId;

        if (finalOldestId !== null) {
          await sqliteKv.setItem(oldestKey, JSON.stringify(finalOldestId));
          console.log("サーバの最古IDを記録したよ:", finalOldestId);
        }
      }

      if (fetched.length > 0) {
        await recordsRepo.insertMany(fetched);
      }

      // 5. 保存できたので、あらためてローカルから読み直して返す
      return recordsRepo.getPage(boardSize, beforeId, limit);
    },
    [],
  );

  return { syncNewer, fetchOlderPage };
}
