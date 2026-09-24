// useRecordsSync.ts

import type { RecordType } from "@/src/active/types/record";
import { recordsRepo } from "@/src/stable/logics/records-repo";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { useCallback } from "react";
import { kvStore } from "storage-kit";

// 🐱 「サーバの底」情報。未確認(kvStoreにキーが無い)なのか、
//    確認済みで0件なのか、確認済みで最古IDがXなのかを型で区別する
type OldestInfo = { confirmedEmpty: true } | { id: number };

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

      // 1.5. ローカルだけで既に足りているなら、通信せず即返す
      if (localPage.length >= limit) {
        console.log("ローカルで足りてるので通信スキップ");
        return localPage;
      }

      // 2. 「これ以上古い棋譜はない」と分かっているかチェックする！
      const oldestKey = `oldest_record_id_${boardSize}`;
      const knownOldestIdStr = await kvStore.getItem(oldestKey);
      console.log("knownOldestIdStr: ", knownOldestIdStr);

      if (knownOldestIdStr !== null) {
        const parsed = JSON.parse(knownOldestIdStr) as OldestInfo | number;

        // 🐱 移行前は素の数値がそのまま保存されていたので、
        //    そのケースだけ { id: number } に読み替えてあげる
        const known: OldestInfo =
          typeof parsed === "number" ? { id: parsed } : parsed;

        if ("confirmedEmpty" in known) {
          // 🐱 確認済みで、そもそもこのボードサイズの棋譜が0件だと分かっている
          console.log("このボードサイズは0件だと確認済み。通信スキップ");
          return localPage;
        }

        const knownOldestId = known.id;
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
        if (fetched.length > 0) {
          // 今回取れた分の中で一番古いIDを底として記録
          const finalOldestId = fetched[fetched.length - 1].id;
          await kvStore.setItem(
            oldestKey,
            JSON.stringify({ id: finalOldestId } satisfies OldestInfo),
          );
          console.log("サーバの最古IDを記録したよ:", finalOldestId);
        } else if (fetchFromId !== null) {
          // 0件だったけど、fetchFromIdより古いものが無いという意味で記録
          await kvStore.setItem(
            oldestKey,
            JSON.stringify({ id: fetchFromId } satisfies OldestInfo),
          );
          console.log("サーバの最古IDを記録したよ:", fetchFromId);
        } else {
          // 🐱 fetchFromIdもnull＝そもそもこのボードサイズの棋譜が1件も無い、と確定
          await kvStore.setItem(
            oldestKey,
            JSON.stringify({ confirmedEmpty: true } satisfies OldestInfo),
          );
          console.log("このボードサイズは0件だと確認したよ");
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
