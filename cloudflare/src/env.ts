// env.ts

import type { AuthEnv } from "./auth";
import type { GameRoom } from "./game-room";

// Workerが受け取る、全部の「道具」(D1、秘密の値、Durable Objectsの部屋の入り口、R2)
export type AppEnv = AuthEnv & {
  QUEUE_ROOM: DurableObjectNamespace;
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  RECORDS: R2Bucket;
  REVENUECAT_WEBHOOK_AUTH: string; // RevenueCatからの通知が、本物かを見分ける合言葉
  // メインのDB(DB)は、AuthEnv(auth.ts)の中にある
  RECORDS_DB: D1Database; // 棋譜だけを入れる、別のDB
};
