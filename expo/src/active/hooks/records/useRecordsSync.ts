// useRecordsSync.ts

import type { RecordType } from "@/src/active/types/record";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import { sqliteKv } from "@/src/stable/services/storage/sqlite";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { useCallback } from "react";

export function useRecordsSync() {
  // ---- ページ取得(表示用) ----
  const fetchOlderPage = useCallback(
    async (
      uid: string,
      boardSize: number,
      beforeId: number | null,
      limit: number,
    ): Promise<RecordType[]> => {
      const localNewestId = await recordsRepo.getNewestId(boardSize);
      const localOldestId = await recordsRepo.getOldestId(boardSize);
      console.log("localNewestId: ", localNewestId);
      console.log("localOldestId: ", localOldestId);

      // 1. ローカルから取得を試みる
      const localPage = await recordsRepo.getPage(boardSize, beforeId, limit);
      if (localPage.length >= limit) {
        console.log("ローカルだけで足りたよ");
        return localPage;
      }

      // 2. 「これ以上古い棋譜はない」と分かっているかチェックする！
      const oldestKey = `oldest_record_id_${boardSize}`;
      const knownOldestIdStr = await sqliteKv.getItem(oldestKey);
      console.log("knownOldestIdStr: ", knownOldestIdStr);

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

      console.log("localNewestId: ", localNewestId);
      console.log("localOldestId: ", localOldestId);

      // 5. 保存できたので、あらためてローカルから読み直して返す
      return recordsRepo.getPage(boardSize, beforeId, limit);
    },
    [],
  );

  return { fetchOlderPage };
}
