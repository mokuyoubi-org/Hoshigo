// env.ts

import type { AuthEnv } from "./auth";
import type { GameRoom } from "./game-room";

// Workerが受け取る、全部の「道具」(D1、秘密の値、Durable Objectsの部屋の入り口、R2)
export type AppEnv = AuthEnv & {
  QUEUE_ROOM: DurableObjectNamespace;
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  RECORDS: R2Bucket;
};