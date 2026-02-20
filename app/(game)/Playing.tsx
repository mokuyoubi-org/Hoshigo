import { GoBoardWithReplay } from "@/src/components/GoBoardWithReplay";
import LoadingOverlay from "@/src/components/LoadingOverlay";
import { PlayerCard } from "@/src/components/PlayerCard";
import { ResultModal } from "@/src/components/ResultModal";
import { pointsToGumiIndex } from "@/src/lib/gumiUtils";
import { moveNumbersToStrings, moveStringsToNumbers } from "@/src/lib/utils";
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DisplayNameContext,
  GumiIndexContext,
  IconIndexContext,
  JwtContext,
  PointsContext,
  SetGumiIndexContext,
  SetPointsContext,
  UserNameContext,
} from "../../src/components/UserContexts";
import {
  BOARD_SIZE_COUNT,
  Board,
  Color,
  Grid,
  applyMove,
  cloneBoard,
  getOppositeColor,
  initializeBoard,
  isLegalMove,
  keyToGrid,
  stringifyGrid,
} from "../../src/lib/goLogics";
import {
  Agehama,
  gnuGridstoStringGrids,
  makeTerritoryBoard,
  movesToSgf,
  resultToLanguagesComment,
  sleep,
} from "../../src/lib/goUtils";
import { supabase } from "../../src/services/supabase";

const BOARD_PIXEL_SIZE = 300;
const CELL_SIZE = BOARD_PIXEL_SIZE / (BOARD_SIZE_COUNT - 1);
const STONE_PIXEL_SIZE = 36;

// ── 定数 ──────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 10_000; // ハートビート送信間隔
const OPPONENT_TIMEOUT_MS = 20_000; // 相手の接続切れと判定するまでの時間
const SUBSCRIPTION_RETRY_LIMIT = 5; // サブスク失敗時の最大リトライ回数
const SUBSCRIPTION_RETRY_DELAY_MS = 3_000; // リトライ間隔
const GNU_API_TIMEOUT_MS = 30_000; // GNUGo APIのタイムアウト

export default function Playing() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const matchId = params.matchId;

  if (params.color !== "black" && params.color !== "white") {
    throw new Error("不正な color が渡されました");
  }
  const playerColor: Color = params.color;
  const opponentsIconIndex: number = Number(params.opponentsIconIndex);
  const opponentsGumiIndex: number = Number(params.opponentsGumiIndex);
  const opponentsUserName = Array.isArray(params.opponentsUserName)
    ? params.opponentsUserName[0]
    : params.opponentsUserName;
  const opponentsDisplayName = Array.isArray(params.opponentsDisplayName)
    ? params.opponentsDisplayName[0]
    : params.opponentsDisplayName;
  let [opponentsPoints, setOpponentsPoints] = useState<number>(
    Number(params.opponentsPoints),
  );
  const opponentsGames: number = Number(params.opponentsGames);

  // ── Context ──────────────────────────────────────
  const jwt = useContext(JwtContext);
  const myIconIndex = useContext(IconIndexContext);
  const myUserName = useContext(UserNameContext);
  const myDisplayName = useContext(DisplayNameContext);
  const pointsGlobal = useContext(PointsContext);
  const setPoints = useContext(SetPointsContext);
  const gumiIndex = useContext(GumiIndexContext);
  const setGumiIndex = useContext(SetGumiIndexContext);

  // ── State: 盤面 ──────────────────────────────────
  const [board, setBoard] = useState<Board>(initializeBoard());
  const boardRef = useRef<Board>(initializeBoard());
  const boardHistoryRef = useRef<Board[]>([initializeBoard()]);
  const teritoryBoardRef = useRef<number[][]>(
    Array.from({ length: BOARD_SIZE_COUNT }, () =>
      Array.from({ length: BOARD_SIZE_COUNT }, () => 0),
    ),
  );
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);

  // ── State: 手 ────────────────────────────────────
  const [lastMove, setLastMove] = useState<Grid | null>(null);
  const movesRef = useRef<string[]>([]);

  // ── State: 時間・接続 ─────────────────────────────
  const [isMyTurn, setIsMyTurn] = useState<boolean | null>(null);
  const turn = useRef<"black" | "white">("black");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myRemainSecondsRef = useRef(180);
  const opponentsRemainSecondsRef = useRef(180);
  const [myRemainSecondsDisplay, setMyRemainingSecondsDisplay] = useState(180);
  const [opponentsRemainSecondsDisplay, setOpponentsRemainingSecondsDisplay] =
    useState(180);

  // 時間切れ負けデバッグ用
  // const myRemainSecondsRef = useRef(10);
  // const opponentsRemainSecondsRef = useRef(10);
  // const [myRemainSecondsDisplay, setMyRemainingSecondsDisplay] = useState(10);
  // const [opponentsRemainSecondsDisplay, setOpponentsRemainingSecondsDisplay] =
  //   useState(10);

  const meLastSeenRef = useRef(Date.now());
  const opponentLastSeenRef = useRef(Date.now());

  // ── State: 結果・リプレイ ─────────────────────────
  const [resultComment, setResultComment] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const currentIndexRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConnection, setLoadingConnection] = useState(false);
  const pointsBeforeRef = useRef<number | null>(null);
  const pointsAfterRef = useRef<number | null>(null);
  const gumiIndexBeforeRef = useRef<number | null>(null);
  const gumiIndexAfterRef = useRef<number | null>(null);

  // ── ハートビート送信中フラグ ──────────────────────
  // payloadで確認できるまでは「送信済み」とみなさない設計のため、
  // 送信中の間だけ重複送信を防ぐフラグとして使う
  const isHeartbeatInFlightRef = useRef(false);

  // ── サブスクリプション管理 ────────────────────────
  const subscriptionRetryCountRef = useRef(0);
  const isGameEndedRef = useRef(false); // useEffect内でisGameEndedを参照するためのref

  if (!matchId) {
    console.warn("matchId がありません");
    router.replace("/Home");
    return null;
  }

  // ── リプレイ: インデックス変更ハンドラ ───────────────
  const handleCurrentIndexChange = (newIndex: number) => {
    currentIndexRef.current = newIndex;
    setBoard(boardHistoryRef.current[newIndex]);
    boardRef.current = boardHistoryRef.current[newIndex];
  };

  // ── ポイント更新 ──────────────────────────────────
  // この中でsetShowResultは行う
  const updateMyPoints = (result: string) => {
    if (
      pointsGlobal === null ||
      setPoints === null ||
      setGumiIndex === null ||
      gumiIndex === null
    )
      return;

    let newPoints = pointsGlobal;
    pointsBeforeRef.current = pointsGlobal;
    gumiIndexBeforeRef.current = gumiIndex;

    const isBlackWin = result.startsWith("B+");
    const isWhiteWin = result.startsWith("W+");
    const isMeBlack = playerColor === "black";
    const isMeWhite = playerColor === "white";
    const isWin = (isBlackWin && isMeBlack) || (isWhiteWin && isMeWhite);
    const diff = pointsGlobal - opponentsPoints;

    let delta: number;
    if (isWin) {
      delta = Math.max(0, Math.min(10, 5 - Math.trunc(diff / 50)));
    } else {
      delta = Math.max(0, Math.min(10, 5 + Math.trunc(diff / 50)));
    }

    if (isWin) {
      newPoints += delta;
    } else {
      if (opponentsGames >= 100) {
        newPoints -= delta;
      }
    }

    newPoints = Math.max(0, newPoints);
    setPoints(newPoints);
    pointsAfterRef.current = newPoints;

    let tempGumiIndex = pointsToGumiIndex(newPoints);
    if (tempGumiIndex > gumiIndex) {
      gumiIndexAfterRef.current = tempGumiIndex;
      setGumiIndex(tempGumiIndex);
    } else {
      gumiIndexAfterRef.current = gumiIndex;
      setGumiIndex(gumiIndex);
    }

    setShowResult(true);
  };

  // ── Supabase: matches テーブル更新（リトライ付き） ─────
  const updateSupabaseMatchesTable = async (
    updateData: object,
    retries = 3,
  ): Promise<boolean> => {
    if (!matchId) return false;
    for (let attempt = 0; attempt < retries; attempt++) {
      const { error } = await supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId)
        .select();
      if (!error) return true;
      console.warn(
        `updateSupabaseMatchesTable: 試行 ${attempt + 1}/${retries} 失敗`,
        error,
      );
      if (attempt < retries - 1) await sleep(1000 * (attempt + 1)); // 指数バックオフ
    }
    console.error("updateSupabaseMatchesTable: 全リトライ失敗");
    return false;
  };

  // ── 対局終了処理 ──────────────────────────────────
  const endGame = () => {
    console.log("endGame: moves =", movesRef.current);
    isGameEndedRef.current = true;
    setIsGameEnded(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  // ── サブスクリプション登録（リトライ対応）────────────
  const setupSubscription = () => {
    // 既存チャンネルがあれば破棄
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          // ゲーム終了後のペイロードは無視
          if (isGameEndedRef.current) return;

          const opponentColor = getOppositeColor(playerColor);
          const me_last_seen = `${playerColor}_last_seen`;
          const opponent_last_seen = `${opponentColor}_last_seen`;
          const stringMoves = moveNumbersToStrings(payload.new.moves);
          const stringDeadStones = moveNumbersToStrings(
            payload.new.dead_stones,
          );

          // ── 接続情報を常に更新 ──
          // meLastSeenRef はローカルでは更新せず、必ずpayloadで確認してから更新する。
          // 自分がオフラインでsupabaseへの書き込みが届いていない場合を正しく検出するため。
          opponentLastSeenRef.current = new Date(
            payload.new[opponent_last_seen],
          ).getTime();
          meLastSeenRef.current = new Date(payload.new[me_last_seen]).getTime();
          isHeartbeatInFlightRef.current = false; // payloadで確認できたのでリセット

          console.log(
            "payload受信: turn =",
            payload.new.turn,
            "result =",
            payload.new.result,
          );

          // ── ケース1: 終局結果（R/T/C/地計算）を受け取った ──
          const hasResult = payload.new.result;
          const isSentByOpponent =
            payload.new.turn === getOppositeColor(playerColor);
          const isConnectionWin = hasResult && payload.new.result[2] === "C";

          if (isConnectionWin) console.log("isConnectionWinはtrue");

          if (hasResult && (isSentByOpponent || isConnectionWin)) {
            console.log("結果を受信:", payload.new.result);
            setLoading(false);
            const result: string = payload.new.result;
            const suffix = result[2];

            if (suffix === "R" || suffix === "T" || suffix === "C") {
              setResultComment(
                resultToLanguagesComment(result, playerColor) ??
                  t("Playing.matchComplete"),
              );
            } else {
              // 地計算結果
              const territoryBoard = makeTerritoryBoard(
                boardRef.current,
                stringDeadStones,
                0, // matchType
              ).territoryBoard;
              teritoryBoardRef.current = territoryBoard;

              setResultComment(
                resultToLanguagesComment(result, playerColor) ??
                  t("Playing.matchComplete"),
              );
            }
            setLoading(false);
            setLoadingConnection(false);

            // setShowResult(true);
            endGame();

            (async () => {
              await sleep(1000);
              try {
                const { error } = await supabase.rpc("move_match_to_archive", {
                  match_id: matchId,
                });
                if (error) console.error("アーカイブ移動失敗:", error);
                else console.log("アーカイブ移動成功");
              } catch (err) {
                console.error("アーカイブ移動: 予期せぬエラー:", err);
              }
            })();

            updateMyPoints(result);
            return;
          }

          // ── ケース2: 相手からの着手/パスを受け取った ──
          const isNewMove =
            (stringMoves?.length ?? 0) === (movesRef.current?.length ?? 0) + 1;
          const isTurnFlipped = payload.new.turn === playerColor;

          if (isNewMove && isTurnFlipped) {
            const move: string = stringMoves[stringMoves.length - 1];
            console.log("相手の手を受信:", move);

            // 残り時間を同期
            myRemainSecondsRef.current =
              playerColor === "black"
                ? Number(payload.new.black_remain_seconds)
                : Number(payload.new.white_remain_seconds);
            opponentsRemainSecondsRef.current =
              playerColor === "black"
                ? Number(payload.new.white_remain_seconds)
                : Number(payload.new.black_remain_seconds);
            setMyRemainingSecondsDisplay(myRemainSecondsRef.current);
            setOpponentsRemainingSecondsDisplay(
              opponentsRemainSecondsRef.current,
            );

            if (move === "p") {
              // パス受信
              movesRef.current = [...movesRef.current, "p"];
              currentIndexRef.current++;
              setLastMove({ row: 0, col: 0 });
              boardHistoryRef.current = [
                ...boardHistoryRef.current,
                cloneBoard(boardRef.current),
              ];
              const last =
                agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
              agehamaHistoryRef.current.push({ ...last });
              setAgehamaHistory([...agehamaHistoryRef.current]);
            } else {
              // 着手受信
              const { board: newBoard, agehama } = applyMove(
                keyToGrid(move),
                cloneBoard(boardRef.current),
                getOppositeColor(playerColor),
              );
              setBoard(newBoard);
              movesRef.current = [
                ...movesRef.current,
                stringifyGrid(keyToGrid(move)),
              ];
              currentIndexRef.current++;
              setLastMove(keyToGrid(move));
              boardRef.current = newBoard;
              boardHistoryRef.current = [...boardHistoryRef.current, newBoard];

              const lastAgehama =
                agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
              if (getOppositeColor(playerColor) === "black") {
                agehamaHistoryRef.current.push({
                  ...lastAgehama,
                  black: lastAgehama.black + agehama,
                });
              } else {
                agehamaHistoryRef.current.push({
                  ...lastAgehama,
                  white: lastAgehama.white + agehama,
                });
              }
              setAgehamaHistory([...agehamaHistoryRef.current]);
            }

            setIsMyTurn(true);
            turn.current = playerColor;
            return;
          }

          // ── ケース3: 相手からのパス速報（2連続パス目）を受け取った ──
          const isSecondPassBroadcast =
            stringMoves[stringMoves.length - 1] === "p" &&
            movesRef.current[movesRef.current.length - 1] === "p" &&
            payload.new.turn === getOppositeColor(playerColor) &&
            (stringMoves?.length ?? 0) === (movesRef.current?.length ?? 0) + 1;

          if (isSecondPassBroadcast) {
            console.log("2連続パス速報を受信");
            movesRef.current = [...movesRef.current, "p"];
            currentIndexRef.current++;
            setLastMove({ row: 0, col: 0 });
            boardHistoryRef.current = [
              ...boardHistoryRef.current,
              cloneBoard(boardRef.current),
            ];
            const last =
              agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
            agehamaHistoryRef.current.push({ ...last });
            setAgehamaHistory([...agehamaHistoryRef.current]);
            setLoading(true);
          }
        },
      )
      .subscribe((status) => {
        console.log("購読ステータス:", status);

        if (status === "SUBSCRIBED") {
          console.log("購読完了");
          subscriptionRetryCountRef.current = 0; // リトライカウントをリセット
          // meLastSeenRef はここでは更新しない。
          // payloadで自分の last_seen が返ってきた時点で初めて更新する設計。
          isHeartbeatInFlightRef.current = true; // 送信中フラグを立ててから送信
          updateSupabaseMatchesTable({
            [`${playerColor}_last_seen`]: new Date(),
            [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
          });
        }

        // ── サブスク失敗時のリトライ ──────────────────────────
        if (
          (status === "CHANNEL_ERROR" || status === "TIMED_OUT") &&
          !isGameEndedRef.current
        ) {
          if (subscriptionRetryCountRef.current < SUBSCRIPTION_RETRY_LIMIT) {
            subscriptionRetryCountRef.current++;
            console.warn(
              `サブスク失敗 (${status}): ${subscriptionRetryCountRef.current}/${SUBSCRIPTION_RETRY_LIMIT} 回目のリトライを ${SUBSCRIPTION_RETRY_DELAY_MS}ms 後に実行`,
            );
            setTimeout(() => {
              if (!isGameEndedRef.current) {
                setupSubscription();
              }
            }, SUBSCRIPTION_RETRY_DELAY_MS);
          } else {
            console.error(
              "サブスク: 最大リトライ回数に達しました。対局を終了します。",
            );
            // リトライ上限を超えたら接続切れ負けとして処理
            const result = playerColor === "black" ? "W+C" : "B+C";
            setResultComment(
              resultToLanguagesComment(result, playerColor) ??
                t("Playing.matchComplete"),
            );
            setShowResult(true);
            endGame();
          }
        }
      });

    subscriptionRef.current = channel;
  };

  // ── 時間タイマー ──────────────────────────────────
  useEffect(() => {
    const loseByTimeout = async () => {
      setIsMyTurn(false);
      turn.current = getOppositeColor(playerColor);
      const opponentsLetter = playerColor === "black" ? "W" : "B";
      const result = `${opponentsLetter}+T`;
      await updateSupabaseMatchesTable({ result, status: "ended" });
      setResultComment(
        resultToLanguagesComment(result, playerColor) ??
          t("Playing.matchComplete"),
      );
      // setShowResult(true);
      endGame();
      updateMyPoints(result);
    };

    timerRef.current = setInterval(() => {
      if (isGameEndedRef.current) return;

      // ── 相手のタイマー ──
      if (turn.current !== playerColor) {
        opponentsRemainSecondsRef.current = Math.max(
          0,
          opponentsRemainSecondsRef.current - 1,
        );
        setOpponentsRemainingSecondsDisplay(
          Math.ceil(opponentsRemainSecondsRef.current),
        );
      }
      // ── 自分のタイマー ──
      else {
        myRemainSecondsRef.current = Math.max(
          0,
          myRemainSecondsRef.current - 1,
        );
        setMyRemainingSecondsDisplay(myRemainSecondsRef.current);
        if (myRemainSecondsRef.current === 0) {
          loseByTimeout();
          return;
        }
      }

      // ── 相手の接続切れ判定 ──
      const now = Date.now();
      if (
        now - opponentLastSeenRef.current > OPPONENT_TIMEOUT_MS &&
        now - meLastSeenRef.current < HEARTBEAT_INTERVAL_MS
      ) {
        const result = playerColor === "black" ? "B+C" : "W+C";
        console.log("相手の接続切れを検出:", result);
        updateSupabaseMatchesTable({ result, status: "ended" });
        setResultComment(
          resultToLanguagesComment(result, playerColor) ??
            t("Playing.matchComplete"),
        );
        setLoadingConnection(true);
        // setShowResult(true);
        // endGame();
        // updateMyPoints(result);
        return;
      }

      // ── ハートビート送信（HEARTBEAT_INTERVAL_MS ごと）──
      // meLastSeenRef はローカルで更新せず、payloadで確認できた時点で更新される。
      // 送信中フラグ（isHeartbeatInFlightRef）で重複送信だけを防ぐ。
      if (
        now - meLastSeenRef.current > HEARTBEAT_INTERVAL_MS &&
        !isHeartbeatInFlightRef.current
      ) {
        isHeartbeatInFlightRef.current = true; // 送信中フラグを立ててから送信
        updateSupabaseMatchesTable({
          [`${playerColor}_last_seen`]: new Date(),
          [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
          moves: moveStringsToNumbers(movesRef.current),
        });
        console.log(
          "ハートビート送信: meLastSeenRef.current =",
          meLastSeenRef.current,
        );
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Realtime監視: マウント時に一度だけ登録 ────────────
  useEffect(() => {
    setIsMyTurn(playerColor === "black");
    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // ── 音 ────────────────────────────────────────────
  const soundFile = require("../../assets/sounds/stone.mp3");
  const stonePlayer = useAudioPlayer(soundFile);
  const playStoneSound = () => {
    stonePlayer.seekTo(0);
    stonePlayer.play();
  };

  // ── GNUGo API（タイムアウト付き fetch）────────────────
  const fetchGnuGoScore = async (sgf: string): Promise<string[] | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GNU_API_TIMEOUT_MS);
    try {
      const response = await fetch("https://gnugo-api.fly.dev/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ sgf }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error("GNUGo APIエラー:", body);
        return null;
      }
      const gnuDeadStones = await response.json();
      return gnuGridstoStringGrids(gnuDeadStones);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.error("GNUGo API: タイムアウト");
      } else {
        console.error("GNUGo API: 予期せぬエラー", err);
      }
      return null;
    }
  };

  // ── パス ──────────────────────────────────────────
  const pass = async () => {
    if (!isMyTurn || isGameEnded) return;

    try {
      movesRef.current = [...movesRef.current, "p"];
      currentIndexRef.current++;
      setLastMove({ row: 0, col: 0 });
      boardHistoryRef.current = [
        ...boardHistoryRef.current,
        cloneBoard(boardRef.current),
      ];
      const last =
        agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
      agehamaHistoryRef.current.push({ ...last });
      setAgehamaHistory([...agehamaHistoryRef.current]);

      setIsMyTurn(false);
      turn.current = getOppositeColor(playerColor);

      const isFirstPass = movesRef.current[movesRef.current.length - 2] !== "p";

      if (isFirstPass) {
        console.log("1回目のパス");
        const now = new Date();
        myRemainSecondsRef.current++;
        setMyRemainingSecondsDisplay(myRemainSecondsRef.current);
        // meLastSeenRef はローカルで更新しない（payloadで確認してから更新する設計）
        isHeartbeatInFlightRef.current = true; // パス送信中フラグを立てる
        await updateSupabaseMatchesTable({
          turn: getOppositeColor(playerColor),
          moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
          turn_switched_at: now,
          [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
          [`${playerColor}_last_seen`]: now,
        });
      } else {
        // 2回目のパス → 地計算
        console.log("2回目のパス: 地計算開始");
        setIsGameEnded(true);
        isGameEndedRef.current = true;
        setLoading(true);

        // まずパスだけ速報
        await updateSupabaseMatchesTable({
          moves: moveStringsToNumbers(movesRef.current),
        });

        // endGame でタイマー・サブスクを止める（ただし地計算後に結果を送る必要があるので先に止める）
        endGame();

        const stringDeadStones = await fetchGnuGoScore(
          movesToSgf(movesRef.current),
        );

        if (stringDeadStones === null) {
          // API失敗: 死に石なしで計算（フォールバック）
          console.warn("GNUGo API失敗: 死に石なしでフォールバック");
          const { territoryBoard, result } = makeTerritoryBoard(
            boardRef.current,
            [],
            0,
          );
          teritoryBoardRef.current = territoryBoard;
          const success = await updateSupabaseMatchesTable({
            result,
            status: "ended",
            dead_stones: [],
          });
          if (!success) console.error("フォールバック結果の送信失敗");
          setLoading(false);
          setResultComment(
            resultToLanguagesComment(result, playerColor) ??
              t("Playing.matchComplete"),
          );
          // setShowResult(true);
          updateMyPoints(result);
        } else {
          console.log("死に石:", stringDeadStones);
          const { territoryBoard, result } = makeTerritoryBoard(
            boardRef.current,
            stringDeadStones,
            0,
          );
          teritoryBoardRef.current = territoryBoard;
          const success = await updateSupabaseMatchesTable({
            result,
            status: "ended",
            dead_stones: moveStringsToNumbers(stringDeadStones),
          });
          if (!success) console.error("地計算結果の送信失敗");
          setLoading(false);
          setResultComment(
            resultToLanguagesComment(result, playerColor) ??
              t("Playing.matchComplete"),
          );
          // setShowResult(true);
          updateMyPoints(result);
        }
      }
    } finally {
    }
  };

  // ── 投了 ──────────────────────────────────────────
  const resign = async () => {
    if (!isMyTurn || isGameEnded) return;

    try {
      setIsMyTurn(false);
      turn.current = getOppositeColor(playerColor);

      const result = `${playerColor === "black" ? "W" : "B"}+R`;
      console.log("投了:", result);

      const success = await updateSupabaseMatchesTable({
        result,
        status: "ended",
      });
      if (!success) {
        // 投了送信失敗 → 操作を戻す
        console.error("投了送信失敗: 操作を戻します");
        setIsMyTurn(true);
        turn.current = playerColor;
        return;
      }

      setResultComment(
        resultToLanguagesComment(result, playerColor) ??
          t("Playing.matchComplete"),
      );
      // setShowResult(true);
      endGame();
      updateMyPoints(result);
    } finally {
      if (!isGameEndedRef.current) {
      }
    }
  };

  // ── 着手 ──────────────────────────────────────────
  const handlePutStone = async (grid: Grid) => {
    if (!isMyTurn || isGameEnded) return;

    if (
      !isLegalMove(
        grid,
        boardRef.current,
        lastMove,
        playerColor,
        boardHistoryRef.current[boardHistoryRef.current.length - 2] ||
          initializeBoard(),
      )
    )
      return;

    try {
      playStoneSound();
      const { board: newBoard, agehama } = applyMove(
        grid,
        cloneBoard(boardRef.current),
        playerColor,
      );

      setBoard(newBoard);
      boardRef.current = newBoard;
      boardHistoryRef.current = [...boardHistoryRef.current, newBoard];

      const lastAgehama =
        agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
      if (playerColor === "black") {
        agehamaHistoryRef.current.push({
          ...lastAgehama,
          black: lastAgehama.black + agehama,
        });
      } else {
        agehamaHistoryRef.current.push({
          ...lastAgehama,
          white: lastAgehama.white + agehama,
        });
      }
      setAgehamaHistory([...agehamaHistoryRef.current]);

      setLastMove(grid);
      movesRef.current = [...movesRef.current, stringifyGrid(grid)];
      currentIndexRef.current++;

      setIsMyTurn(false);
      turn.current = getOppositeColor(playerColor);

      const now = new Date();
      myRemainSecondsRef.current++;
      setMyRemainingSecondsDisplay(myRemainSecondsRef.current);
      // meLastSeenRef はローカルで更新しない（payloadで確認してから更新する設計）
      isHeartbeatInFlightRef.current = true; // 着手送信中フラグを立てる

      const success = await updateSupabaseMatchesTable({
        turn: getOppositeColor(playerColor),
        moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
        turn_switched_at: now,
        [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
        [`${playerColor}_last_seen`]: now,
      });

      if (!success) {
        // 着手の送信失敗 → 盤面を戻す
        console.error("着手送信失敗: 盤面を戻します");
        movesRef.current = movesRef.current.slice(0, -1);
        currentIndexRef.current--;
        boardHistoryRef.current = boardHistoryRef.current.slice(0, -1);
        agehamaHistoryRef.current = agehamaHistoryRef.current.slice(0, -1);
        const prevBoard =
          boardHistoryRef.current[boardHistoryRef.current.length - 1];
        boardRef.current = prevBoard;
        setBoard(prevBoard);
        setAgehamaHistory([...agehamaHistoryRef.current]);
        setIsMyTurn(true);
        turn.current = playerColor;
      }
    } finally {
    }
  };

  // ── 結果OKボタン ──────────────────────────────────
  const onPressOK = () => {
    console.log("OK pressed");
    setShowResult(false); // これはok
    const finalIndex = boardHistoryRef.current.length - 1;
    currentIndexRef.current = finalIndex;
    setBoard(boardHistoryRef.current[finalIndex]);
    boardRef.current = boardHistoryRef.current[finalIndex];
  };

  // ── レンダリング ──────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {isGameEnded && (
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/(tabs)/Home")}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹ {t("Playing.back")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isGameEnded && (
          <View style={styles.resultButtonContainer}>
            <TouchableOpacity
              style={styles.resultButton}
              onPress={() => setShowResult(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.resultButtonText}>{t("Playing.result")}</Text>
            </TouchableOpacity>
          </View>
        )}

        <PlayerCard
          gumiIndex={opponentsGumiIndex}
          iconIndex={opponentsIconIndex}
          username={opponentsUserName || ""}
          displayname={opponentsDisplayName || ""}
          points={opponentsPoints || 0}
          color={getOppositeColor(playerColor)}
          time={opponentsRemainSecondsDisplay}
          isActive={true}
        />

        <GoBoardWithReplay
          matchType={0}
          agehamaHistory={agehamaHistory}
          board={board}
          onPutStone={handlePutStone}
          moveHistory={movesRef.current}
          territoryBoard={teritoryBoardRef.current}
          disabled={!isMyTurn}
          isGameEnded={isGameEnded}
          boardHistory={boardHistoryRef.current}
          currentIndex={currentIndexRef.current}
          onCurrentIndexChange={handleCurrentIndexChange}
        />

        <PlayerCard
          gumiIndex={gumiIndex ?? 0}
          iconIndex={myIconIndex ?? 0}
          username={myUserName || ""}
          displayname={myDisplayName || ""}
          points={pointsGlobal || 0}
          color={playerColor}
          time={myRemainSecondsDisplay}
          isActive={true}
        />

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (!isMyTurn || isGameEnded) && styles.actionButtonDisabled,
            ]}
            onPress={pass}
            disabled={!isMyTurn || isGameEnded}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.actionButtonText,
                (!isMyTurn || isGameEnded) && styles.actionButtonTextDisabled,
              ]}
            >
              {t("Playing.pass")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resignButton,
              (!isMyTurn || isGameEnded) && styles.resignButtonDisabled,
            ]}
            onPress={resign}
            disabled={!isMyTurn || isGameEnded}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.resignButtonText,
                (!isMyTurn || isGameEnded) && styles.resignButtonTextDisabled,
              ]}
            >
              {t("Playing.resign")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ResultModal
        visible={showResult}
        resultComment={resultComment ?? ""}
        onPressOK={onPressOK}
        pointsBefore={pointsBeforeRef.current ?? 0}
        pointsAfter={pointsAfterRef.current ?? 0}
        gumiIndexBefore={gumiIndexBeforeRef.current ?? 0}
        gumiIndexAfter={gumiIndexAfterRef.current ?? 0}
      />

      {loading && <LoadingOverlay text={t("Playing.calculating")} />}
      {loadingConnection && <LoadingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButtonContainer: {
    width: "20%",
    alignItems: "flex-start",
    position: "absolute",
    top: 20,
    left: 32,
    zIndex: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: "#2d3748",
    fontWeight: "600",
  },
  resultButtonContainer: {
    width: "20%",
    alignItems: "flex-end",
    position: "absolute",
    top: 20,
    right: 32,
    zIndex: 10,
  },
  resultButton: {
    paddingVertical: 8,
  },
  resultButtonText: {
    fontSize: 18,
    color: "#2d3748",
    fontWeight: "600",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerIndicator: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  playerStone: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  playerTextContainer: {
    alignItems: "flex-start",
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2d3748",
    letterSpacing: 0.5,
  },
  boardContainer: {
    backgroundColor: "#8dbcd2",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  boardWrapper: {
    width: BOARD_PIXEL_SIZE,
    height: BOARD_PIXEL_SIZE,
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    width: 2,
    height: BOARD_PIXEL_SIZE,
    backgroundColor: "#d3e4ec",
  },
  horizontalLine: {
    position: "absolute",
    width: BOARD_PIXEL_SIZE,
    height: 2,
    backgroundColor: "#d3e4ec",
  },
  intersection: {
    position: "absolute",
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  stone: {
    width: STONE_PIXEL_SIZE,
    height: STONE_PIXEL_SIZE,
    borderRadius: STONE_PIXEL_SIZE / 2,
    borderWidth: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
    opacity: 1,
  },
  blackStone: {
    backgroundColor: "#2d3748",
  },
  blackStoneNewest: {
    backgroundColor: "#677387", // 黒
    borderWidth: STONE_PIXEL_SIZE * 0.24, // 白丸部分
    borderColor: "#2d3748",
  },
  blackStoneDead: {
    backgroundColor: "#2d3748",
    opacity: 0.48,
  },
  whiteStone: {
    backgroundColor: "#ffffff",
  },
  whiteStoneNewest: {
    backgroundColor: "#e1e1e1", // 黒
    borderWidth: STONE_PIXEL_SIZE * 0.24, // 白丸部分
    borderColor: "#ffffff",
  },
  whiteStoneDead: {
    backgroundColor: "#ffffff",
    opacity: 0.48,
  },

  emptyGrid: {
    width: STONE_PIXEL_SIZE / 2,
    height: STONE_PIXEL_SIZE / 2,
    borderRadius: 4,
    opacity: 0.32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 1,
  },
  blackTerritory: {
    backgroundColor: "#2d3748",
  },
  whiteTerritory: {
    backgroundColor: "#ffffff",
  },
  dameOrSeki: {
    opacity: 0,
  },

  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#2d3748",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonDisabled: {
    backgroundColor: "#cbd5e0",
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  actionButtonTextDisabled: {
    color: "#718096",
  },
  resignButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e53e3e",
  },
  resignButtonDisabled: {
    borderColor: "#e2e8f0",
  },
  resignButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e53e3e",
    letterSpacing: 0.5,
  },
  resignButtonTextDisabled: {
    color: "#cbd5e0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  resultComment: {
    fontSize: 18,
    color: "#2d3748",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 26,
  },
  resultActions: {
    width: "100%",
    gap: 12,
  },
  okButton: {
    backgroundColor: "#2d3748",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  okButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  playAgainButton: {
    backgroundColor: "#ffffff",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  returnHomeButton: {
    backgroundColor: "#ffffff",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  playAgainButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d3748",
    letterSpacing: 0.5,
  },
  returnHomeButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d3748",
    letterSpacing: 0.5,
  },
  replayControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around", // ←これで左右に広がる
    gap: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "100%", // ←これを追加
  },
  replayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2d3748",
    justifyContent: "center",
    alignItems: "center",
  },
  replayButtonDisabled: {
    backgroundColor: "#e2e8f0",
  },
  replayButtonText: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "700",
  },
  replayButtonTextDisabled: {
    color: "#cbd5e0",
  },
  replayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    minWidth: 80,
    textAlign: "center",
  },
});
