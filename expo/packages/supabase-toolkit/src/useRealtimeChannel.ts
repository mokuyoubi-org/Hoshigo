import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";

export function useRealtimeChannel<
  T extends Record<string, (payload: any) => void>,
>(
  client: SupabaseClient,
  channelName: string | null,
  handlers: T,
  enabled: boolean = true,
) {
  const handlersRef = useRef(handlers);
  // 🐱 チャンネルオブジェクトを保持しておくref
  const channelRef = useRef<ReturnType<SupabaseClient["channel"]> | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // 🐱 チャンネルを登録（接続）する内部関数
  const subscribeChannel = useCallback(() => {
    if (!channelName || !enabled) return;

    // すでに接続があれば削除してから新しく作る
    if (channelRef.current) {
      client.removeChannel(channelRef.current);
    }

    const channel = client.channel(channelName);

    for (const event of Object.keys(handlersRef.current)) {
      channel.on("broadcast", { event }, (p) =>
        handlersRef.current[event]?.(p),
      );
    }

    channel.subscribe((status, err) => {
      if (err) console.error(`🐱 ${channelName} channel error:`, err);
    });

    channelRef.current = channel;
  }, [client, channelName, enabled]);

  // 🐱 外部から呼べる再接続（再登録）用の関数
  const reconnect = useCallback(() => {
    console.log(
      `🐱 [useRealtimeChannel] ${channelName} を再登録（再接続）する`,
    );
    subscribeChannel();
  }, [channelName, subscribeChannel]);

  useEffect(() => {
    subscribeChannel();

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribeChannel, client]);

  // 🐱 reconnect を外に返してあげる
  return { reconnect };
}
