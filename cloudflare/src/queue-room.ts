// queue-room.ts
//
// 対戦相手を探す人が並ぶ「受付」の仕事場(Durable Object)。
// 盤面ごとに1つの部屋があり、部屋の名前は 9 / 13 / 19。
// 組み合わせが決まったら、対局の部屋(game-room.ts)を作って、2人に "matched" を送る。
//
// やること:
//  1. 受け付ける: つながってきた人を、待機列に入れる(入れる前に、下の確認をする)
//     ① プロフィールと成績の行が無ければ作る(ensureProfile)
//     ② すでに対局中なら、待機列に入れず、"resume" を送って続きから戻す
//     ③ ゲストが、その盤面の1日の上限(10局)に達していたら、"DAILY_PLAY_LIMIT_REACHED" で断る
//     ④ 同じ人がすでに待っていたら、古いほうのつながりを閉じる(二重に待たないように)
//  2. 待たせる: 待っている人の情報(レーティング・待った回数など)は、
//     WebSocketの「付箋」(attachment)に持つ。DBには書かない
//  3. 見回る: 待っている人がいるあいだ、3秒ごとにアラームが鳴って、マッチングを試す
//     - 待った回数の多い人から。同じなら、先に来た人から
//     - 人間戦: レーティングの差が「待った回数 × 300点(最大1000点)」以内で、いちばん近い人
//     - ボット戦: 4回待っても組めず、ボット対戦を許可している人は、ボットと対戦
//     - 組めなかった人は、待った回数を1つ増やす
//  4. 組めたら: 対局の部屋を作って(GameRoom.init)、「対局中」の目印(activeGames)を書いて、
//     2人の「今日の対局数」を+1する。そのあと "matched" を送って、待機列から外す
//  5. やめる: アプリから "cancel" が届いたら、"canceled" を返して閉じる
//
// 部屋から送るメッセージ: queued / matched / resume / canceled / error
// アプリから送るメッセージ: cancel
// (アプリ側の受け口は useMatchingProvider.ts)
//
// 注意:
//  - WebSocketは Hibernation API(acceptWebSocket)で受ける。待っているあいだも眠れて、料金がかからない
//  - 時間の管理は setTimeout ではなく、アラーム(ctx.storage.setAlarm)を使う
//  - 誰も待っていなければ、アラームは次をセットせず、そこで終わる(次の人が来たら、また始まる)
//  - 生きているかの確認(ping → pong)は、眠ったまま自動で返す
//  - 1組のマッチングに失敗しても、ほかの人のマッチングは止めない(try/catch)

import { DurableObject } from "cloudflare:workers";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as appSchema from "./db/app-schema";
import type { AppEnv } from "./env";
import {
  buildMatchedPayload,
  type MatchInit,
  type PlayerInfo,
} from "./game-room";
import { pickBot } from "./logic/bots";
import { ensureProfile } from "./rpc/profile";

const { activeGames, profiles, userSettings, userStats } = appSchema;

const ALARM_INTERVAL_MS = 3000; // マッチングを試す間隔
const BOT_AFTER_TRIES = 4; // この回数、待っても組めなかったら、ボット戦
const RATING_DIFF_PER_TRY = 300; // 待つたびに、相手の幅が広がる点数
const MAX_RATING_DIFF = 1000; // 相手の幅の上限
const DAILY_LIMIT_FOR_GUESTS = 10; // ゲスト(匿名)の、1日の対局数の上限(盤面ごと)

// 盤面ごとの持ち時間(秒)
const SECONDS_BY_BOARD: Record<number, number> = { 19: 605, 13: 305, 9: 185 };

// 待っている人の「付箋」(眠っても残る小さなメモ)
type Waiter = {
  uid: string;
  boardSize: number;
  rating: number;
  allowBotMatch: boolean;
  joinedAt: number;
  tryCount: number;
};

type Entry = { ws: WebSocket; waiter: Waiter };

// 待機列の部屋。盤面ごとに1つ(名前は 9 / 13 / 19)。
export class QueueRoom extends DurableObject<AppEnv> {
  constructor(ctx: DurableObjectState, env: AppEnv) {
    super(ctx, env);
    // 生きているかの確認(ping → pong)は、眠ったまま自動で返す。料金がかからない。
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  private get db() {
    return drizzle(this.env.DB, { schema: appSchema });
  }

  // つながりを受けて、1通だけ送って、すぐ閉じる(再開、エラーなどの、お知らせ用)
  private replyAndClose(
    message: unknown,
    closeCode: number,
    reason: string,
  ): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(message));
    server.close(closeCode, reason);
    return new Response(null, { status: 101, webSocket: client });
  }

  // 対局の途中なら、その対局の「続きから戻るための情報」を返す。なければ null。
  private async findResumableGame(uid: string) {
    const [active] = await this.db
      .select()
      .from(activeGames)
      .where(eq(activeGames.uid, uid));
    if (!active) return null;

    const payload = await this.env.GAME_ROOM.get(
      this.env.GAME_ROOM.idFromName(active.gameId),
    ).getMatched(uid);
    if (payload) return payload;

    // 対局はもう無いのに、目印だけ残っていたので、目印を消す
    await this.db.delete(activeGames).where(eq(activeGames.uid, uid));
    return null;
  }

  // Workerから、「この人が待機列に入りたいって」と、つながってくる
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const uid = request.headers.get("x-user-id");
    if (!uid) {
      return new Response("Unauthorized", { status: 401 });
    }
    const boardSize = Number(request.headers.get("x-board-size"));
    if (![9, 13, 19].includes(boardSize)) {
      return new Response("Invalid board size", { status: 400 });
    }
    const isAnonymous = request.headers.get("x-user-anonymous") === "1";

    // プロフィールと成績の行が、まだ無ければ作る(成績の更新が、空振りしないように)
    await ensureProfile(this.db, uid);

    // ① 対局の途中なら、続きから再開させる(待機列には入れない)
    const resume = await this.findResumableGame(uid);
    if (resume) {
      return this.replyAndClose(
        { type: "resume", match: resume },
        1000,
        "resume",
      );
    }

    // この人の、この盤面でのレーティング・今日の対局数と、ボット対戦の許可を調べる
    const [stats] = await this.db
      .select({
        rating: userStats.rating,
        dailyPlayCount: userStats.dailyPlayCount,
      })
      .from(userStats)
      .where(and(eq(userStats.uid, uid), eq(userStats.boardSize, boardSize)));
    const [setting] = await this.db
      .select({ allowBotMatch: userSettings.allowBotMatch })
      .from(userSettings)
      .where(
        and(eq(userSettings.uid, uid), eq(userSettings.boardSize, boardSize)),
      );

    // ② ゲストは、その盤面の今日の対局数が上限なら、待機列に入れない
    if (isAnonymous && (stats?.dailyPlayCount ?? 0) >= DAILY_LIMIT_FOR_GUESTS) {
      return this.replyAndClose(
        {
          type: "error",
          error: {
            code: "DAILY_PLAY_LIMIT_REACHED",
            message: "daily_play_limit_reached",
          },
        },
        1008,
        "DAILY_PLAY_LIMIT_REACHED",
      );
    }

    // 同じ人が、すでに待っていたら、古い方のつながりを閉じる(二重に待たないように)
    for (const ws of this.ctx.getWebSockets()) {
      const waiter = ws.deserializeAttachment() as Waiter | null;
      if (waiter?.uid === uid) {
        try {
          ws.close(1000, "replaced");
        } catch {
          // すでに閉じていたら、何もしない
        }
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Hibernation API(acceptWebSocket)で受ける。
    // つながっているあいだも、何も動いていなければ眠れる(実行時間の料金がかからない)。
    this.ctx.acceptWebSocket(server);

    const waiter: Waiter = {
      uid,
      boardSize,
      rating: stats?.rating ?? 0,
      allowBotMatch: setting?.allowBotMatch ?? true,
      joinedAt: Date.now(),
      tryCount: 1,
    };
    server.serializeAttachment(waiter);
    server.send(JSON.stringify({ type: "queued" }));

    // 3秒後のアラームが、まだセットされていなければ、セットする
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // アプリからメッセージが来たとき
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;

    let data: { type?: string };
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // 待機をやめる
    if (data.type === "cancel") {
      ws.send(JSON.stringify({ type: "canceled" }));
      ws.close(1000, "canceled");
    }
  }

  // つながりが切れたとき(待っていた人が、いなくなる)。
  // 付箋ごと消えるので、特にやることはない。
  async webSocketClose() {}

  async webSocketError(ws: WebSocket) {
    try {
      ws.close(1011, "error");
    } catch {
      // すでに閉じていたら、何もしない
    }
  }

  // 3秒ごとに鳴る。待っている人たちの、マッチングを試す(いまの try_match_all)。
  async alarm() {
    const entries: Entry[] = [];
    for (const ws of this.ctx.getWebSockets()) {
      const waiter = ws.deserializeAttachment() as Waiter | null;
      if (waiter) entries.push({ ws, waiter });
    }
    // 誰も待っていなければ、アラームは、ここで終わり(次はセットしない)
    if (entries.length === 0) return;

    // 待った回数の多い人から。同じなら、先に来た人から。
    entries.sort(
      (a, b) =>
        b.waiter.tryCount - a.waiter.tryCount ||
        a.waiter.joinedAt - b.waiter.joinedAt,
    );

    const matched = new Set<string>(); // 組めた人のuid

    for (const cur of entries) {
      if (matched.has(cur.waiter.uid)) continue;

      try {
        // 🤖 ボット戦: 4回以上待っていて、ボット対戦を許可している人
        if (
          cur.waiter.tryCount >= BOT_AFTER_TRIES &&
          cur.waiter.allowBotMatch
        ) {
          const ok = await this.matchWithBot(cur);
          // ボットが見つからなかったら、何もせずに、次の人へ(回数も増やさない)
          if (ok) matched.add(cur.waiter.uid);
          continue;
        }

        // 👦 人間戦: レーティングの差が、待った回数 × 300(最大1000)以内で、いちばん近い人
        const limit = Math.min(
          cur.waiter.tryCount * RATING_DIFF_PER_TRY,
          MAX_RATING_DIFF,
        );
        let best: Entry | null = null;
        let bestDiff = Infinity;
        for (const other of entries) {
          if (other === cur || matched.has(other.waiter.uid)) continue;
          if (other.waiter.uid === cur.waiter.uid) continue;
          const diff = Math.abs(other.waiter.rating - cur.waiter.rating);
          if (diff <= limit && diff < bestDiff) {
            best = other;
            bestDiff = diff;
          }
        }

        if (best) {
          await this.matchHumans(cur, best);
          matched.add(cur.waiter.uid);
          matched.add(best.waiter.uid);
        } else {
          // 組めなかったので、待った回数を1つ増やす
          cur.waiter.tryCount += 1;
          cur.ws.serializeAttachment(cur.waiter);
        }
      } catch (e) {
        // 1組の失敗で、ほかの人のマッチングが止まらないように
        console.error("マッチングに失敗:", e);
      }
    }

    // まだ待っている人がいれば、3秒後に、もう一度
    if (entries.some((e) => !matched.has(e.waiter.uid))) {
      await this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
    }
  }

  // 人間同士の対局を作る(白黒は、いつもランダム)
  private async matchHumans(a: Entry, b: Entry) {
    const boardSize = a.waiter.boardSize;
    const aIsBlack = Math.random() < 0.5;
    const black = aIsBlack ? a : b;
    const white = aIsBlack ? b : a;

    const profileMap = await this.getProfiles([a.waiter.uid, b.waiter.uid]);
    const infoOf = (e: Entry): PlayerInfo => ({
      uid: e.waiter.uid,
      username: profileMap.get(e.waiter.uid)?.username ?? "",
      iconIndex: profileMap.get(e.waiter.uid)?.iconIndex ?? 0,
      rating: e.waiter.rating,
    });

    const init: MatchInit = {
      gameId: crypto.randomUUID(),
      boardSize,
      matchType: 0,
      blackUid: black.waiter.uid,
      whiteUid: white.waiter.uid,
      black: infoOf(black),
      white: infoOf(white),
      firstTurn: "black",
      seconds: SECONDS_BY_BOARD[boardSize],
      botMatch: false,
      botColor: null,
    };
    await this.createGame(init, [a.waiter.uid, b.waiter.uid]);

    this.sendMatched(a, init, aIsBlack ? "black" : "white");
    this.sendMatched(b, init, aIsBlack ? "white" : "black");
  }

  // ボットとの対局を作る。ボットが見つからなければ false。
  private async matchWithBot(human: Entry): Promise<boolean> {
    const boardSize = human.waiter.boardSize;
    const bot = pickBot(human.waiter.rating, boardSize);
    if (!bot) return false;

    // ボットは、名前(bot1 / bot2 / bot3)で、プロフィールを探す
    const [botProfile] = await this.db
      .select({
        uid: profiles.uid,
        username: profiles.username,
        iconIndex: profiles.iconIndex,
      })
      .from(profiles)
      .where(eq(profiles.username, bot.botName));
    if (!botProfile) {
      console.warn(`ボット ${bot.botName} のプロフィールが見つかりません`);
      return false;
    }

    const [botStats] = await this.db
      .select({ rating: userStats.rating })
      .from(userStats)
      .where(
        and(
          eq(userStats.uid, botProfile.uid),
          eq(userStats.boardSize, boardSize),
        ),
      );

    const humanProfile = (await this.getProfiles([human.waiter.uid])).get(
      human.waiter.uid,
    );
    const humanPlayer: PlayerInfo = {
      uid: human.waiter.uid,
      username: humanProfile?.username ?? "",
      iconIndex: humanProfile?.iconIndex ?? 0,
      rating: human.waiter.rating,
    };
    const botPlayer: PlayerInfo = {
      uid: botProfile.uid,
      username: botProfile.username,
      iconIndex: botProfile.iconIndex,
      rating: botStats?.rating ?? 0,
    };

    // match_type が1以上なら、人間が黒。0なら、ランダム。
    const humanIsBlack = bot.matchType >= 1 ? true : Math.random() < 0.5;

    const init: MatchInit = {
      gameId: crypto.randomUUID(),
      boardSize,
      matchType: bot.matchType,
      blackUid: humanIsBlack ? humanPlayer.uid : botPlayer.uid,
      whiteUid: humanIsBlack ? botPlayer.uid : humanPlayer.uid,
      black: humanIsBlack ? humanPlayer : botPlayer,
      white: humanIsBlack ? botPlayer : humanPlayer,
      // 置き石(2以上)があるなら白番スタート、互先・コミ落ち(0または1)なら黒番スタート
      firstTurn: bot.matchType > 1 ? "white" : "black",
      seconds: SECONDS_BY_BOARD[boardSize],
      botMatch: true,
      botColor: humanIsBlack ? "white" : "black",
    };
    await this.createGame(init, [humanPlayer.uid]);

    this.sendMatched(human, init, humanIsBlack ? "black" : "white");
    return true;
  }

  // 対局の部屋を作って、「対局中」の目印を書いて、2人の「今日の対局数」を+1する。
  // humanUids は、人間だけ(ボットには、目印を作らない)。
  private async createGame(init: MatchInit, humanUids: string[]) {
    await this.env.GAME_ROOM.get(
      this.env.GAME_ROOM.idFromName(init.gameId),
    ).init(init);

    // 対局中の目印(古い目印が残っていたら、上書きする)
    const now = new Date();
    await this.db
      .insert(activeGames)
      .values(
        humanUids.map((uid) => ({
          uid,
          gameId: init.gameId,
          boardSize: init.boardSize,
          createdAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: activeGames.uid,
        set: { gameId: init.gameId, boardSize: init.boardSize, createdAt: now },
      });

    // 今日の対局数を+1(いまの notify_match と同じ。ボットの分も増える)
    await this.db
      .update(userStats)
      .set({ dailyPlayCount: sql`${userStats.dailyPlayCount} + 1` })
      .where(
        and(
          inArray(userStats.uid, [init.blackUid, init.whiteUid]),
          eq(userStats.boardSize, init.boardSize),
        ),
      );
  }

  private async getProfiles(uids: string[]) {
    const rows = await this.db
      .select({
        uid: profiles.uid,
        username: profiles.username,
        iconIndex: profiles.iconIndex,
      })
      .from(profiles)
      .where(inArray(profiles.uid, uids));
    return new Map(rows.map((r) => [r.uid, r]));
  }

  // 「マッチしたよ」を送って、待機列から外す(つながりを閉じる)。
  private sendMatched(me: Entry, init: MatchInit, myColor: "black" | "white") {
    try {
      me.ws.send(
        JSON.stringify({
          type: "matched",
          match: buildMatchedPayload(
            init,
            myColor,
            [],
            init.seconds,
            init.seconds,
          ),
        }),
      );
      me.ws.close(1000, "matched");
    } catch {
      // すでに閉じていたら、何もしない
    }
  }
}
