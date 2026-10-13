// game-room.ts
import { DurableObject } from "cloudflare:workers";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as appSchema from "./db/app-schema";
import type { AppEnv } from "./env";
import { calculateDrawDelta, calculateMatchDelta } from "./logic/rating";

const { userStats, recordCards, activeGames } = appSchema;

// 局面ごとの分析(アプリのKataGoが出した結果)。数字は、全部、整数。黒から見た値。
type StoredAnalysis = {
  ownership: number[]; // 各マスの地の見込み(-100〜100)
  scoreLead: number; // 目数の差(10倍)
  winRate: number; // 勝率(1000倍)
};

const BOARD_CELLS: Record<number, number> = { 9: 81, 13: 169, 19: 361 };
const ANALYSIS_KEY_PREFIX = "a:"; // 部屋の中の、分析の置き場の名前の頭

// 整数で、範囲の中に入っているか
function isIntInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= min &&
    (value as number) <= max
  );
}

// 対局に参加する人の情報(「マッチしたよ」で、相手の情報として、アプリに送る)
export type PlayerInfo = {
  uid: string;
  username: string;
  iconIndex: number;
  rating: number;
};

// 対局のはじめの情報(待機列の部屋が、組み合わせが決まったときに渡す)
export type MatchInit = {
  gameId: string;
  boardSize: number;
  matchType: number;
  blackUid: string;
  whiteUid: string;
  black: PlayerInfo;
  white: PlayerInfo;
  firstTurn: "black" | "white";
  seconds: number; // 持ち時間(秒)。黒白とも同じ
  botMatch: boolean;
  botColor: "black" | "white" | null; // ボット戦なら、ボットの色
};

// 「マッチしたよ」の中身。
// 新しくマッチしたとき(手は空)と、途中から再開するとき(手が入っている)の、両方で使う。
export function buildMatchedPayload(
  init: MatchInit,
  myColor: "black" | "white",
  moves: number[],
  blackSeconds: number,
  whiteSeconds: number,
) {
  const opp = myColor === "black" ? init.white : init.black;
  return {
    match_id: init.gameId,
    board_size: init.boardSize,
    match_type: init.matchType,
    moves,
    my_color: myColor,
    opp_uid: opp.uid,
    opp_rating: opp.rating,
    opp_icon_index: opp.iconIndex,
    opp_username: opp.username,
    my_seconds: myColor === "black" ? blackSeconds : whiteSeconds,
    opp_seconds: myColor === "black" ? whiteSeconds : blackSeconds,
    bot_match: init.botMatch,
  };
}

type Color = "black" | "white";
type Status = "playing" | "pending" | "finished";

// 対局の状態。DO storage の1つの行に、まるごと保存する。
type GameState = {
  init: MatchInit;
  createdAt: number; // 対局が作られた時刻(ms)
  status: Status;
  moves: number[]; // パスは -1
  turn: Color;
  blackSeconds: number;
  whiteSeconds: number;
  turnSwitchedAt: number; // 手番が替わった時刻(ms)
  result: string | null;
  resultBy: Color | null; // 最後に結果を送った人の色
  // 一度でも、つながったことのある色(つながったことのない人の、切断判定はしない)
  seen: { black: boolean; white: boolean };
  // いま切断中の色と、切れた時刻(ms)。つながっていれば null。
  disconnectedAt: { black: number | null; white: number | null };
  // 終局後の仕事(成績の更新、棋譜とカードの保存)が済んだか。失敗したときは、やり直す(最大5回)。
  statsApplied: boolean;
  recordSaved: boolean;
  statsTries: number;
  // 成績を更新する前の、2人のレーティング(棋譜とカードに書く)
  oldRatings: { black: number; white: number } | null;
};

// 終局のあとに送る、レーティングの更新の知らせ
type SideUpdate = {
  old_rating: number;
  new_rating: number;
  wins: number;
  giant_killing_streak: number;
  giant_killing_bonus: boolean;
};
type RatingUpdate = { result: string; black: SideUpdate; white: SideUpdate };

// つながっているWebSocketの「付箋」
type Attachment = { uid: string; color: Color };

const DISCONNECT_LIMIT_MS = 30_000; // 切断から、この時間たったら、切断負け
const PENDING_LIMIT_MS = 30_000; // pending のまま、この時間たったら、強制的に確定
const ALARM_MARGIN_MS = 100; // アラームを、期限より少しあとに鳴らす(ぎりぎりの誤差を避ける)
const NO_SHOW_LIMIT_MS = 120_000; // 対局が作られてから、この時間たっても、一度もつながらない人がいたら、無効にする

// 盤面ごとの、1手ごとの加算時間(秒)
const INCREMENT_BY_BOARD: Record<number, number> = { 9: 2, 13: 4, 19: 6 };

function secondsOf(state: GameState, color: Color): number {
  return color === "black" ? state.blackSeconds : state.whiteSeconds;
}

// 対局の部屋。1局ごとに1つ(名前は gameId)。
export class GameRoom extends DurableObject<AppEnv> {
  private cache: GameState | undefined;

  constructor(ctx: DurableObjectState, env: AppEnv) {
    super(ctx, env);
    // 生きているかの確認(ping → pong)は、眠ったまま自動で返す。料金がかからない。
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  // ===== 状態の読み書き =====

  private async load(): Promise<GameState | undefined> {
    if (!this.cache) {
      this.cache = await this.ctx.storage.get<GameState>("state");
    }
    return this.cache;
  }

  private async save(state: GameState) {
    this.cache = state;
    await this.ctx.storage.put("state", state);
  }

  private isBot(state: GameState, color: Color): boolean {
    return state.init.botColor === color;
  }

  // ===== 待機列の部屋から呼ばれる =====

  // 対局のはじめの情報を、覚える
  async init(match: MatchInit): Promise<void> {
    const state: GameState = {
      init: match,
      createdAt: Date.now(),
      status: "playing",
      moves: [],
      turn: match.firstTurn,
      blackSeconds: match.seconds,
      whiteSeconds: match.seconds,
      turnSwitchedAt: Date.now(),
      result: null,
      resultBy: null,
      seen: { black: false, white: false },
      disconnectedAt: { black: null, white: null },
      statsApplied: false,
      recordSaved: false,
      statsTries: 0,
      oldRatings: null,
    };
    await this.save(state);
    await this.armAlarm(state);
  }

  // 確認用:覚えている状態を返す
  async getState(): Promise<GameState | undefined> {
    return await this.load();
  }

  // 対局の途中で、アプリを閉じて、開き直した人に、「この対局に、続きから戻れるよ」を返す。
  // 終わった対局や、参加者ではない人には null。
  async getMatched(uid: string) {
    const state = await this.load();
    if (!state || state.status === "finished") return null;

    const color =
      uid === state.init.blackUid
        ? "black"
        : uid === state.init.whiteUid
          ? "white"
          : null;
    if (!color) return null;

    return {
      ...buildMatchedPayload(
        state.init,
        color,
        state.moves,
        state.blackSeconds,
        state.whiteSeconds,
      ),
      status: state.status,
      turn: state.turn,
      // 手番が替わってから、何ミリ秒たったか(アプリが、残り時間を計算するため)
      turn_elapsed_ms: Date.now() - state.turnSwitchedAt,
    };
  }

  // ===== WebSocket =====

  // Workerから、「この人が、この対局につなぎたいって」と、つながってくる
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const uid = request.headers.get("x-user-id");
    if (!uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const state = await this.load();
    const color: Color | null = !state
      ? null
      : uid === state.init.blackUid
        ? "black"
        : uid === state.init.whiteUid
          ? "white"
          : null;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Hibernation API(acceptWebSocket)で受ける。眠っていても、料金がかからない。
    this.ctx.acceptWebSocket(server);

    // 対局がない、または、この対局の参加者ではない
    if (!state || !color) {
      server.send(
        JSON.stringify({
          type: "error",
          error: {
            code: !state ? "GAME_NOT_FOUND" : "NOT_A_PLAYER",
            message: !state ? "Game not found" : "Not a player of this game",
          },
        }),
      );
      server.close(1008, !state ? "GAME_NOT_FOUND" : "NOT_A_PLAYER");
      return new Response(null, { status: 101, webSocket: client });
    }

    // 同じ色の、古いつながりがあれば、閉じる(再接続)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const att = ws.deserializeAttachment() as Attachment | null;
      if (att?.color === color) {
        try {
          ws.close(1000, "replaced");
        } catch {
          // すでに閉じていたら、何もしない
        }
      }
    }

    server.serializeAttachment({ uid, color } satisfies Attachment);

    // つながったので、「切断中」の印を消す
    state.seen[color] = true;
    state.disconnectedAt[color] = null;
    await this.save(state);

    // いまの状態を送る(つなぎ直したときに、盤面を合わせるため)
    server.send(JSON.stringify(this.stateMessage(state, color)));

    if (state.status === "finished") {
      server.close(1000, "finished");
    } else {
      await this.armAlarm(state);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // アプリからメッセージが来たとき
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;

    let data: {
      type?: string;
      move?: unknown;
      bot?: unknown;
      result?: unknown;
      pos?: unknown;
      ownership?: unknown;
      score_lead?: unknown;
      win_rate?: unknown;
    };
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const att = ws.deserializeAttachment() as Attachment | null;
    const state = await this.load();
    if (!att || !state) return;

    switch (data.type) {
      case "move":
        await this.handleMove(ws, state, att, data.move, data.bot === true);
        break;
      case "resign":
        await this.handleResign(ws, state, att);
        break;
      case "submit_result":
        await this.handleSubmitResult(ws, state, att, data.result);
        break;
      case "analysis":
        await this.handleAnalysis(ws, state, data);
        break;
    }
  }

  // つながりが切れたとき
  async webSocketClose(ws: WebSocket) {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.handleDisconnect(ws);
  }

  // ===== 手・投了・結果 =====

  // 手を打つ(いまの add_move + on_move_added)
  private async handleMove(
    ws: WebSocket,
    state: GameState,
    att: Attachment,
    move: unknown,
    asBot: boolean,
  ) {
    if (state.status !== "playing") {
      return this.sendError(ws, "NOT_PLAYING", "対局中ではありません");
    }
    if (typeof move !== "number" || !Number.isInteger(move)) {
      return this.sendError(ws, "INVALID_MOVE", "手が正しくありません");
    }

    // 手番チェック。asBot なら「本当にボットの手番か」を、必ず確認する。
    let acting: Color;
    if (asBot) {
      if (state.init.botColor !== null && state.turn === state.init.botColor) {
        acting = state.turn;
      } else {
        return this.sendError(ws, "NOT_BOT_TURN", "botの手番ではありません");
      }
    } else {
      if (state.turn === att.color) {
        acting = att.color;
      } else {
        return this.sendError(ws, "NOT_YOUR_TURN", "手番ではありません");
      }
    }

    const now = Date.now();
    const elapsedMs = now - state.turnSwitchedAt;

    // 人間の持ち時間が、すでに切れていたら、手を受け付けずに、時間切れで終局
    if (
      !this.isBot(state, acting) &&
      secondsOf(state, acting) - elapsedMs / 1000 < 0
    ) {
      await this.finish(state, acting === "black" ? "W+T" : "B+T");
      return;
    }

    // 手を打った人の残り時間を更新(経過秒を引いて、1手ごとの加算を足す)
    const elapsedSec = Math.round(elapsedMs / 1000);
    const increment = INCREMENT_BY_BOARD[state.init.boardSize] ?? 1;
    if (acting === "black") {
      state.blackSeconds = state.blackSeconds - elapsedSec + increment;
    } else {
      state.whiteSeconds = state.whiteSeconds - elapsedSec + increment;
    }

    state.moves.push(move);
    state.turn = acting === "black" ? "white" : "black";
    state.turnSwitchedAt = now;

    // パスが2回続いたら、結果の確認待ち(pending)にする
    const n = state.moves.length;
    const doublePass =
      n >= 2 && state.moves[n - 1] === -1 && state.moves[n - 2] === -1;
    if (doublePass) state.status = "pending";

    await this.save(state);

    this.broadcast({
      type: "move",
      move,
      move_count: n,
      turn: state.turn,
      black_seconds: state.blackSeconds,
      white_seconds: state.whiteSeconds,
    });
    if (doublePass) this.broadcast({ type: "double_pass" });

    await this.armAlarm(state);
  }

  // 投了(いまの resign)
  private async handleResign(ws: WebSocket, state: GameState, att: Attachment) {
    if (state.status !== "playing") {
      return this.sendError(ws, "NOT_PLAYING", "対局中ではありません");
    }
    await this.finish(state, att.color === "black" ? "W+R" : "B+R");
  }

  // 結果を送る(いまの submit_match_result)
  private async handleSubmitResult(
    ws: WebSocket,
    state: GameState,
    att: Attachment,
    result: unknown,
  ) {
    if (state.status !== "pending") {
      return this.sendError(ws, "NOT_PENDING", "結果の確認待ちではありません");
    }
    if (typeof result !== "string" || result === "" || result.length > 32) {
      return this.sendError(ws, "INVALID_RESULT", "結果が正しくありません");
    }

    // ボット戦は、最初の1通で確定
    if (state.init.botMatch) {
      await this.finish(state, result);
      return;
    }

    // 人間同士: 1人目なら、結果を覚えておく。2人目(別の人)なら、後着優先で確定。
    // (同じ人が、もう1回送ってきたときは、結果を上書きするだけ)
    if (state.result === null || state.resultBy === att.color) {
      state.result = result;
      state.resultBy = att.color;
      await this.save(state);
      return;
    }
    await this.finish(state, result);
  }

  // ===== 分析 =====

  // 分析を受け取る(いまの match_analysis への書き込み)。
  // 局面 pos(0 = まだ1手も打たれていない局面)ごとに1つ。
  // 両方の対局者が、同じ局面を送ってくるので、先に届いた方だけを保存する。
  private async handleAnalysis(
    ws: WebSocket,
    state: GameState,
    data: {
      pos?: unknown;
      ownership?: unknown;
      score_lead?: unknown;
      win_rate?: unknown;
    },
  ) {
    if (state.status === "finished") return;

    const { pos, ownership, score_lead: scoreLead, win_rate: winRate } = data;
    const cells = BOARD_CELLS[state.init.boardSize];

    // 中身が正しいか確認(変なデータが、R2に入らないように)
    if (
      !isIntInRange(pos, 0, state.moves.length) ||
      !Array.isArray(ownership) ||
      ownership.length !== cells ||
      !ownership.every((v) => isIntInRange(v, -100, 100)) ||
      !isIntInRange(scoreLead, -10000, 10000) ||
      !isIntInRange(winRate, 0, 1000)
    ) {
      return this.sendError(
        ws,
        "INVALID_ANALYSIS",
        "分析のデータが正しくありません",
      );
    }

    const key = ANALYSIS_KEY_PREFIX + String(pos).padStart(4, "0");
    // もう届いていたら、何もしない(先に届いた方を使う)
    if ((await this.ctx.storage.get(key)) !== undefined) return;

    await this.ctx.storage.put(key, {
      ownership: ownership as number[],
      scoreLead,
      winRate,
    } satisfies StoredAnalysis);
  }

  // 局面ごとにためた分析を、項目ごとの配列(位置 = 局面の番号、無い局面は null)にして、
  // R2の analysis/{id}.json に書く。1つも届いていなければ、何もしない。
  private async saveAnalysis(state: GameState) {
    const entries = await this.ctx.storage.list<StoredAnalysis>({
      prefix: ANALYSIS_KEY_PREFIX,
    });
    if (entries.size === 0) return;

    const length = state.moves.length + 1;
    const ownership: (number[] | null)[] = new Array(length).fill(null);
    const scoreLead: (number | null)[] = new Array(length).fill(null);
    const winRate: (number | null)[] = new Array(length).fill(null);

    for (const [key, value] of entries) {
      const pos = Number(key.slice(ANALYSIS_KEY_PREFIX.length));
      if (pos >= length) continue;
      ownership[pos] = value.ownership;
      scoreLead[pos] = value.scoreLead;
      winRate[pos] = value.winRate;
    }

    await this.env.RECORDS.put(
      `analysis/${state.init.gameId}.json`,
      JSON.stringify({
        v: 1,
        id: state.init.gameId,
        // model は、b18だけになったので、18で固定
        analysis: {
          model: 18,
          ownership,
          score_lead: scoreLead,
          win_rate: winRate,
        },
      }),
      { httpMetadata: { contentType: "application/json" } },
    );
  }

  // ===== 切断 =====

  private async handleDisconnect(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;
    const state = await this.load();
    if (!state || state.status === "finished") return;

    // 同じ色の、別のつながりが、まだ生きていれば、切断ではない
    const alive = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false;
      const a = other.deserializeAttachment() as Attachment | null;
      return a?.color === att.color;
    });
    if (alive) return;

    // 切断の印をつけて、30秒後のアラームをセット(戻ってきたら、印は消える)
    state.disconnectedAt[att.color] = Date.now();
    await this.save(state);
    await this.armAlarm(state);
  }

  // ===== 終局 =====

  private async finish(state: GameState, result: string) {
    // すでに終わっていたら、何もしない(成績を、2回更新しないため)
    if (state.status === "finished") return;

    state.status = "finished";
    state.result = result;
    state.statsApplied = false;
    state.recordSaved = false;
    state.statsTries = 0;
    state.oldRatings = null;
    await this.save(state);
    await this.ctx.storage.deleteAlarm();

    this.broadcast({ type: "finished", result });

    // 成績を更新して、棋譜とカードを保存して、「レーティングが変わったよ」を送る
    const update = await this.finalize(state);
    if (update) this.broadcast({ type: "rating_updated", ...update });

    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, "finished");
      } catch {
        // すでに閉じていたら、何もしない
      }
    }
  }

  // 終局後の仕事: ①成績の更新(D1)②分析と棋譜の保存(R2)③貸出カード(D1)④部屋の掃除。
  // 失敗したら、5秒後に、最大5回やり直す。済んだ仕事は、やり直さない。
  private async finalize(state: GameState): Promise<RatingUpdate | null> {
    let update: RatingUpdate | null = null;
    try {
      if (!state.statsApplied) {
        update = await this.computeAndApplyStats(state);
        state.oldRatings = {
          black: update.black.old_rating,
          white: update.white.old_rating,
        };
        state.statsApplied = true;
        await this.save(state);
      }
      if (!state.recordSaved) {
        await this.saveAnalysis(state);
        await this.saveRecord(state);
        state.recordSaved = true;
        await this.save(state);
      }

      // 全部済んだら、部屋の中身を、きれいに片付ける(分析の一時データなど)。
      // 残しておくと、対局のたびに、保管料金がじわじわ増えるため。
      if (state.statsApplied && state.recordSaved) {
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
        this.cache = undefined;
      }
    } catch (e) {
      console.error("終局後の保存に失敗:", e);
      state.statsTries += 1;
      await this.save(state);
      if (state.statsTries < 5) {
        await this.ctx.storage.setAlarm(Date.now() + 5000);
      }
    }
    return update;
  }

  // 棋譜の本体をR2に書いて、そのあとで、貸出カードをD1に書く。
  // (順番が逆だと、中身のないカードができてしまうことがある)
  // 最後に、「対局中」の目印を消す。
  private async saveRecord(state: GameState) {
    const { gameId, blackUid, whiteUid, boardSize, matchType, botColor } =
      state.init;
    const old = state.oldRatings ?? { black: 0, white: 0 };
    const result = state.result ?? "VOID";
    const createdAt = new Date(state.createdAt);

    // 棋譜の本体(いまの hoshigo-records-worker と、同じ形)
    const record = {
      v: 1,
      id: gameId,
      black_uid: blackUid,
      white_uid: whiteUid,
      moves: state.moves,
      result,
      black_rating: old.black,
      white_rating: old.white,
      match_type: matchType,
      board_size: boardSize,
      created_at: createdAt.toISOString(),
    };
    await this.env.RECORDS.put(
      `records/${gameId}.json`,
      JSON.stringify(record),
      {
        httpMetadata: { contentType: "application/json" },
      },
    );

    const db = drizzle(this.env.DB, { schema: appSchema });

    // 貸出カード(ボットには作らない)
    const cards: (typeof recordCards.$inferInsert)[] = [];
    if (botColor !== "black") {
      cards.push({
        uid: blackUid,
        gameId,
        boardSize,
        createdAt,
        color: "black",
        oppUid: whiteUid,
        result,
        rating: old.black,
        oppRating: old.white,
        matchType,
      });
    }
    if (botColor !== "white") {
      cards.push({
        uid: whiteUid,
        gameId,
        boardSize,
        createdAt,
        color: "white",
        oppUid: blackUid,
        result,
        rating: old.white,
        oppRating: old.black,
        matchType,
      });
    }
    if (cards.length > 0) {
      // やり直しで、同じカードを2回書いても、エラーにならないように
      await db.insert(recordCards).values(cards).onConflictDoNothing();
    }

    // 「対局中」の目印を消す(これで、2人とも、また待機列に入れる)
    await db.delete(activeGames).where(eq(activeGames.gameId, gameId));
  }

  // レーティングなどを計算して、D1に書く(いまの archive_matches の翻訳)
  private async computeAndApplyStats(state: GameState): Promise<RatingUpdate> {
    const { blackUid, whiteUid, boardSize, botMatch, botColor } = state.init;
    const result = state.result ?? "VOID";
    const db = drizzle(this.env.DB, { schema: appSchema });

    // 2人の、いまの成績
    const rows = await db
      .select()
      .from(userStats)
      .where(
        and(
          inArray(userStats.uid, [blackUid, whiteUid]),
          eq(userStats.boardSize, boardSize),
        ),
      );
    const black = rows.find((r) => r.uid === blackUid);
    const white = rows.find((r) => r.uid === whiteUid);

    const bRating = black?.rating ?? 0;
    const wRating = white?.rating ?? 0;
    const bWins = black?.wins ?? 0;
    const wWins = white?.wins ?? 0;
    const bGames = bWins + (black?.losses ?? 0) + (black?.draws ?? 0);
    const wGames = wWins + (white?.losses ?? 0) + (white?.draws ?? 0);
    const bStreakOld = black?.giantKillingStreak ?? 0;
    const wStreakOld = white?.giantKillingStreak ?? 0;

    let bDelta = 0;
    let wDelta = 0;
    let bStreak = bStreakOld;
    let wStreak = wStreakOld;
    let bWin = 0;
    let bLoss = 0;
    let bDraw = 0;
    let wWin = 0;
    let wLoss = 0;
    let wDraw = 0;

    if (result.startsWith("B+") || result.startsWith("W+")) {
      const blackWon = result.startsWith("B+");
      const r = calculateMatchDelta({
        winner: blackWon ? "black" : "white",
        blackRating: bRating,
        whiteRating: wRating,
        blackGiantKillingStreak: bStreakOld,
        whiteGiantKillingStreak: wStreakOld,
        blackGames: bGames,
        whiteGames: wGames,
        isBotMatch: botMatch,
      });
      if (blackWon) {
        bWin = 1;
        wLoss = 1;
        bDelta = r.winnerDelta;
        wDelta = r.loserDelta;
        bStreak = r.winnerGiantKillingStreak;
        wStreak = r.loserGiantKillingStreak;
      } else {
        wWin = 1;
        bLoss = 1;
        wDelta = r.winnerDelta;
        bDelta = r.loserDelta;
        wStreak = r.winnerGiantKillingStreak;
        bStreak = r.loserGiantKillingStreak;
      }
    } else if (result === "DRAW") {
      bDraw = 1;
      wDraw = 1;
      const r = calculateDrawDelta({
        isBotMatch: botMatch,
        blackRating: bRating,
        whiteRating: wRating,
      });
      bDelta = r.blackDelta;
      wDelta = r.whiteDelta;
    }
    // VOID(無効)などは、何も変えない

    const isBotBlack = botColor === "black";
    const isBotWhite = botColor === "white";

    // 格上に勝った連勝は、ボットには関係ない(更新前に戻す)。ボーナスは、連勝が増えたときだけ。
    if (isBotBlack) bStreak = bStreakOld;
    if (isBotWhite) wStreak = wStreakOld;
    const bBonus = !isBotBlack && bStreak > bStreakOld;
    const wBonus = !isBotWhite && wStreak > wStreakOld;

    // 1人分の更新。ボットは、勝敗の数だけ。人間は、レーティングと連勝も。
    const updateFor = (
      uid: string,
      isBot: boolean,
      win: number,
      loss: number,
      draw: number,
      delta: number,
      streak: number,
    ) =>
      db
        .update(userStats)
        .set(
          isBot
            ? {
                wins: sql`${userStats.wins} + ${win}`,
                losses: sql`${userStats.losses} + ${loss}`,
                draws: sql`${userStats.draws} + ${draw}`,
              }
            : {
                wins: sql`${userStats.wins} + ${win}`,
                losses: sql`${userStats.losses} + ${loss}`,
                draws: sql`${userStats.draws} + ${draw}`,
                rating: sql`max(0, ${userStats.rating} + ${delta})`,
                highestRating: sql`max(${userStats.highestRating}, max(0, ${userStats.rating} + ${delta}))`,
                giantKillingStreak: streak,
              },
        )
        .where(and(eq(userStats.uid, uid), eq(userStats.boardSize, boardSize)));

    // 2人分を、1回のbatchで(両方成功するか、両方なかったことになる)
    await db.batch([
      updateFor(blackUid, isBotBlack, bWin, bLoss, bDraw, bDelta, bStreak),
      updateFor(whiteUid, isBotWhite, wWin, wLoss, wDraw, wDelta, wStreak),
    ]);

    return {
      result,
      black: {
        old_rating: bRating,
        new_rating: isBotBlack ? bRating : Math.max(0, bRating + bDelta),
        wins: bWins + bWin,
        giant_killing_streak: bStreak,
        giant_killing_bonus: bBonus,
      },
      white: {
        old_rating: wRating,
        new_rating: isBotWhite ? wRating : Math.max(0, wRating + wDelta),
        wins: wWins + wWin,
        giant_killing_streak: wStreak,
        giant_killing_bonus: wBonus,
      },
    };
  }

  // ===== アラーム(時間切れ・切断・放置の見回り) =====

  // 人間のうち、まだ一度もつながっていない人がいるか
  private hasUnseenHuman(state: GameState): boolean {
    return (["black", "white"] as const).some(
      (color) => !this.isBot(state, color) && !state.seen[color],
    );
  }

  // 次の期限を計算して、アラームをセットする。
  // 手を打つたびに、書き直さない: 期限が早まるときだけ、セットする。
  // (鳴ったときに、本当の期限がまだ先だったら、alarm() が、セットし直す)
  private async armAlarm(state: GameState) {
    if (state.status === "finished") return;

    const deadlines: number[] = [];

    if (state.status === "playing") {
      // 一度もつながっていない人がいれば、対局が作られてから2分の期限
      if (this.hasUnseenHuman(state)) {
        deadlines.push(state.createdAt + NO_SHOW_LIMIT_MS);
      }
      // 人間の手番なら、持ち時間の期限
      if (!this.isBot(state, state.turn)) {
        deadlines.push(
          state.turnSwitchedAt + secondsOf(state, state.turn) * 1000,
        );
      }
      // 切断中の人がいれば、切断から30秒
      for (const color of ["black", "white"] as const) {
        const at = state.disconnectedAt[color];
        if (!this.isBot(state, color) && at !== null) {
          deadlines.push(at + DISCONNECT_LIMIT_MS);
        }
      }
    } else if (state.status === "pending") {
      deadlines.push(state.turnSwitchedAt + PENDING_LIMIT_MS);
    }

    if (deadlines.length === 0) return;

    const deadline = Math.min(...deadlines) + ALARM_MARGIN_MS;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > deadline) {
      await this.ctx.storage.setAlarm(deadline);
    }
  }

  // 期限の時刻に鳴る(いまの time_connection_check)
  async alarm() {
    const state = await this.load();
    if (!state) return;

    // 終局したあとに鳴ったときは、終局後の仕事のやり直し
    if (state.status === "finished") {
      if (!state.statsApplied || !state.recordSaved) await this.finalize(state);
      return;
    }

    const now = Date.now();

    if (state.status === "playing") {
      // 2分たっても、一度もつながらない人がいたら、無効(成績は変えない)
      if (
        this.hasUnseenHuman(state) &&
        now - state.createdAt > NO_SHOW_LIMIT_MS
      ) {
        await this.finish(state, "VOID");
        return;
      }
      // 時間切れ(人間だけ)
      if (!this.isBot(state, state.turn)) {
        const remaining =
          secondsOf(state, state.turn) - (now - state.turnSwitchedAt) / 1000;
        if (remaining < 0) {
          await this.finish(state, state.turn === "black" ? "W+T" : "B+T");
          return;
        }
      }
      // 切断(人間だけ)
      for (const color of ["black", "white"] as const) {
        const at = state.disconnectedAt[color];
        if (
          !this.isBot(state, color) &&
          at !== null &&
          now - at > DISCONNECT_LIMIT_MS
        ) {
          await this.finish(state, color === "black" ? "W+C" : "B+C");
          return;
        }
      }
    } else if (state.status === "pending") {
      // 結果の確認待ちのまま放置されたら、強制的に確定。
      // 片方だけ結果が届いていればそれを、誰も届いていなければ無効(VOID)。
      if (now - state.turnSwitchedAt > PENDING_LIMIT_MS) {
        await this.finish(state, state.result ?? "VOID");
        return;
      }
    }

    // まだ期限が先だったので、次の期限で、セットし直す
    await this.armAlarm(state);
  }

  // ===== アプリへのメッセージ =====

  // いまの状態(つないだ人に、最初に送る)
  private stateMessage(state: GameState, myColor: Color) {
    return {
      type: "state",
      my_color: myColor,
      status: state.status,
      moves: state.moves,
      move_count: state.moves.length,
      turn: state.turn,
      black_seconds: state.blackSeconds,
      white_seconds: state.whiteSeconds,
      // 手番が替わってから、何ミリ秒たったか(アプリが、残り時間を計算するため)
      turn_elapsed_ms: Date.now() - state.turnSwitchedAt,
      result: state.result,
    };
  }

  private broadcast(message: unknown) {
    const text = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(text);
      } catch {
        // すでに閉じていたら、何もしない
      }
    }
  }

  private sendError(ws: WebSocket, code: string, message: string) {
    try {
      ws.send(JSON.stringify({ type: "error", error: { code, message } }));
    } catch {
      // すでに閉じていたら、何もしない
    }
  }
}
