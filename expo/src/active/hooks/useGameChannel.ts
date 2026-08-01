// @/src/active/hooks/useGameChannel.ts
//
// ─── このhookの責務 ───────────────────────────────────
// 対局中(Playing画面が開いている間)だけ必要な`game:{matchId}`チャンネルを
// 購読・解除する。実際のイベント処理(盤面更新など)はPlaying側から
// handlersとして渡してもらい、ここでは「繋ぐ」ことだけに専念する。
//
// 以前はMatchingContextがこのチャンネルをアカウントレベルで持っていたが、
// gameChannelはPlaying画面が開いている間しか意味を持たないため、
// ここに切り出した。
// ──────────────────────────────────────────────────

import { supabase } from "@/src/stable/services/supabase/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

export type GameChannelHandlers = {
  onMove: (payload: any) => void;
  onDoublePass: (payload: any) => void;
  onFinished: (payload: any) => void;
};

/**
 * matchIdに紐づくgameChannelを購読する。
 *
 * @param matchId  対局id。nullの間は購読しない。
 * @param handlers move/double_pass/finished それぞれの処理。
 *                 毎レンダーで新しい関数が渡ってきてもOK(内部でrefに逃がしている)。
 * @param enabled  falseにすると購読を止める(対局終了時など)。省略時はtrue。
 */
export function useGameChannel(
  matchId: number | null,
  handlers: GameChannelHandlers,
  enabled: boolean = true,
) {
  // ---------------- stale closure対策 ----------------
  // handlers自体を依存配列に入れるとPlaying側の再レンダーの度に
  // チャンネルを張り直すことになってしまうので、refに逃がして
  // 「購読はmatchId/enabledが変わった時だけ」「中身は常に最新」を両立させる。
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!matchId || !enabled) return;

    const channel = supabase.channel(`game:${matchId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "move" }, (p) => handlersRef.current.onMove(p))
      .on("broadcast", { event: "double_pass" }, (p) =>
        handlersRef.current.onDoublePass(p),
      )
      .on("broadcast", { event: "match_finished" }, (p) =>
        handlersRef.current.onFinished(p),
      )
      .subscribe((status, err) => {
        console.log("🐱 gameChannel status:", status, err);
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [matchId, enabled]);
}
