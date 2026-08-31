# supabase-toolkit

Supabaseを使うReact Native/Expoアプリでよく欲しくなる、2つの小さな道具。
どのSupabaseプロジェクト(URL/anonKey)を使うかは一切知らない。渡されたクライアントを使うだけ。

## createResilientClient

`rpc()`のエラーメッセージに特定の文字列(デフォルト`"MAINTENANCE_MODE"`)が
含まれていたら、コールバックで通知してくれるSupabaseクライアントを作る。

```ts
import {
  createResilientClient,
} from "supabase-toolkit";

export const supabase = createResilientClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  storage: myStorageAdapter,
  onErrorMarkerDetected: (msg) => showMaintenanceScreen(msg),
});
```

## useRealtimeChannel

broadcastチャンネルの購読・後片付けをまとめて面倒みてくれるhook。

```ts
import { useRealtimeChannel } from "supabase-toolkit";

useRealtimeChannel(supabase, `match:${matchId}`, {
  move: (payload) => { ... },
  finished: (payload) => { ... },
}, isEnabled);
```
