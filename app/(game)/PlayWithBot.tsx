import { GoBoardWithReplay } from "@/src/components/GoBoardWithReplay";
import { PlayerCard } from "@/src/components/PlayerCard";
import { ResultModal } from "@/src/components/ResultModal";
import { pointsToGumiIndex } from "@/src/lib/gumiUtils";
import { moveStringsToNumbers } from "@/src/lib/utils";
import { useAudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingOverlay from "../../src/components/LoadingOverlay";

import {
  DailyPlayCountContext,
  DisplayNameContext,
  GumiIndexContext,
  IconIndexContext,
  JwtContext,
  PointsContext,
  SetDailyPlayCountContext,
  SetGumiIndexContext,
  SetPointsContext,
  UidContext,
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
  gnuGridtoStringGrid,
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
const GNU_API_TIMEOUT_MS = 30_000; // GNUGo APIのタイムアウト

export default function PlayWithBot() {
  const { t } = useTranslation();

  // ── Context ──────────────────────────────────────
  const uid = useContext(UidContext);
  const jwt = useContext(JwtContext);
  const myUserName = useContext(UserNameContext);
  const myDisplayName = useContext(DisplayNameContext);
  const point = useContext(PointsContext);
  const setPoints = useContext(SetPointsContext);
  const iconIndex = useContext(IconIndexContext);
  const gumiIndex = useContext(GumiIndexContext);
  const setGumiIndex = useContext(SetGumiIndexContext);
  const dailyPlayCount = useContext<number | null>(DailyPlayCountContext);
  const setDailyPlayCount = useContext(SetDailyPlayCountContext);
  const myIconIndex = useContext(IconIndexContext);

  // ── State: マッチ・ボット情報 ─────────────────────
  const [matchId, setMatchId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<Color>("black");
  const [botUserName, setBotUserName] = useState<string | null>(null);
  const [botDisplayName, setBotDisplayName] = useState<string | null>(null);
  const [botPoints, setBotPoints] = useState<number | null>(null);
  const [botUid, setBotUid] = useState<string | null>(null);
  const [botIconIndex, setBotIconIndex] = useState<number | null>(null);
  const [botGumiIndex, setBotGumiIndex] = useState<number | null>(null);
  const isTryingRef = useRef<boolean>(false);

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

  // ── State: 時間 ───────────────────────────────────
  const [isMyTurn, setIsMyTurn] = useState<boolean | null>(null);
  const turn = useRef<"black" | "white">("black");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myRemainSecondsRef = useRef(180);
  const opponentsRemainSecondsRef = useRef(180);
  const [myRemainSecondsDisplay, setMyRemainingSecondsDisplay] = useState(180);
  const [opponentsRemainSecondsDisplay, setOpponentsRemainingSecondsDisplay] =
    useState(180);
  // ボット対戦ではmeLastSeenRefはローカル更新でOK
  // （相手がボットなので「自分が本当に接続できているか」の検証が不要）
  const meLastSeenRef = useRef(Date.now());
  const opponentLastSeenRef = useRef(Date.now());

  // ── State: 結果・リプレイ ─────────────────────────
  const [resultComment, setResultComment] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const isGameEndedRef = useRef(false); // タイマー内のクロージャ問題対策
  const currentIndexRef = useRef<number>(0);
  const [loading, setLoading] = useState(false);
  const pointsBeforeRef = useRef<number | null>(null);
  const pointsAfterRef = useRef<number | null>(null);
  const gumiIndexBeforeRef = useRef<number | null>(null);
  const gumiIndexAfterRef = useRef<number | null>(null);

  // ── 二重操作ガード ────────────────────────────────
  // const isActionInProgressRef = useRef(false);

  // ── リプレイ: インデックス変更ハンドラ ───────────────
  const handleCurrentIndexChange = (newIndex: number) => {
    currentIndexRef.current = newIndex;
    setBoard(boardHistoryRef.current[newIndex]);
    boardRef.current = boardHistoryRef.current[newIndex];
  };

  // ── ポイント更新 ──────────────────────────────────
  const updateLocalPoints = (result: string) => {
    if (
      point === null ||
      setPoints === null ||
      botPoints === null ||
      setGumiIndex === null ||
      gumiIndex === null
    )
      return;

    let newPoint = point;
    pointsBeforeRef.current = point;
    gumiIndexBeforeRef.current = gumiIndex;

    console.log("元々のレート: ", point);

    const isBlackWin = result.startsWith("B+");
    const isWhiteWin = result.startsWith("W+");
    const isMeBlack = playerColor === "black";
    const isMeWhite = playerColor === "white";
    const isWin = (isBlackWin && isMeBlack) || (isWhiteWin && isMeWhite);
    const diff = point - botPoints;

    let delta: number;
    if (isWin) {
      delta = Math.max(0, Math.min(10, 5 - Math.trunc(diff / 50)));
    } else {
      // 格上のボットに負けてもポイントは減らない
      if (botPoints > pointsBeforeRef.current) {
        delta = 0;
      } else {
        delta = Math.max(0, Math.min(10, 5 + Math.trunc(diff / 50)));
      }
    }

    if (isWin) {
      newPoint += delta;
      setBotPoints(Math.max(0, botPoints - delta));
    } else {
      newPoint -= delta;
      setBotPoints(Math.max(0, botPoints + delta));
    }

    newPoint = Math.max(0, newPoint);
    setPoints(newPoint);
    pointsAfterRef.current = newPoint;
    console.log("新しいレート: ", newPoint);

    let tempGumiIndex = pointsToGumiIndex(newPoint);
    if (tempGumiIndex > gumiIndex) {
      gumiIndexAfterRef.current = tempGumiIndex;
      setGumiIndex(tempGumiIndex);
    } else {
      gumiIndexAfterRef.current = gumiIndex;
      setGumiIndex(gumiIndex);
    }
    console.log("新しいgumiIndex: ", gumiIndexAfterRef.current);
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
      if (attempt < retries - 1) await sleep(1000 * (attempt + 1));
    }
    console.error("updateSupabaseMatchesTable: 全リトライ失敗");
    return false;
  };

  // ── アーカイブ移動 ────────────────────────────────
  const callRpc = async () => {
    await sleep(1000);
    try {
      const { data, error } = await supabase.rpc("move_match_to_archive", {
        match_id: matchId,
      });
      if (error) console.error("アーカイブ移動に失敗しました:", error);
      else console.log("アーカイブ移動成功:", data);
    } catch (err) {
      console.error("予期せぬエラー:", err);
    }
  };

  // ── 対局終了処理 ──────────────────────────────────
  const endGameStopTimerCallRpc = async () => {
    isGameEndedRef.current = true;
    setIsGameEnded(true);
    // isActionInProgressRef.current = false; // ガードをリセット
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    callRpc();
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
      setShowResult(true);
      endGameStopTimerCallRpc();
      updateLocalPoints(result);
    };

    timerRef.current = setInterval(() => {
      if (isGameEndedRef.current) return; // ★ ゲーム終了後はタイマー処理をスキップ

      if (turn.current !== playerColor) {
        opponentsRemainSecondsRef.current = Math.max(
          0,
          opponentsRemainSecondsRef.current - 1,
        );
        setOpponentsRemainingSecondsDisplay(
          Math.ceil(opponentsRemainSecondsRef.current),
        );
      } else {
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

      // ── ハートビート送信（HEARTBEAT_INTERVAL_MS ごと）──
      // ボット対戦ではローカル更新でOK
      if (Date.now() - meLastSeenRef.current > HEARTBEAT_INTERVAL_MS) {
        const now = new Date();
        meLastSeenRef.current = +now;
        updateSupabaseMatchesTable({
          [`${playerColor}_last_seen`]: now,
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

  // ── 音 ────────────────────────────────────────────
  const soundFile = require("../../assets/sounds/stone.mp3");
  const stonePlayer = useAudioPlayer(soundFile);
  const playStoneSound = () => {
    stonePlayer.seekTo(0);
    stonePlayer.play();
  };

  // ── マッチ作成 ────────────────────────────────────
  const makeMatchWithBot = async () => {
    if (isTryingRef.current || matchId) {
      console.log("すでにマッチがあるのでスキップ:", {
        isTrying: isTryingRef.current,
        matchId,
      });
      return;
    }
    isTryingRef.current = true;

    try {
      console.log("🎮 match_with_bot RPC 実行:", new Date().toISOString());
      const { data, error } = await supabase.rpc("match_with_bot", {
        p_black_uid: uid,
        p_black_username: myUserName,
        p_black_displayname: myDisplayName,
        p_black_points: point,
        p_black_icon_index: iconIndex,
        p_black_gumi_index: gumiIndex,
      });

      if (error) {
        console.error("RPCエラー", error);
        return;
      }

      const res = data[0];
      if (!res) {
        console.log("RPCから送られてきたデータはありません");
        return;
      }
      console.log("✅ ボットとのマッチ作成成功:", res.match_id);

      setMatchId(res.match_id);
      setBotUid(res.bot_uid);
      setBotUserName(res.bot_username);
      setBotDisplayName(res.bot_displayname);
      setBotPoints(res.bot_points);
      setBotIconIndex(res.bot_icon_index);
      setBotGumiIndex(res.bot_gumi_index);
    } finally {
      isTryingRef.current = false;
    }
  };

  // ── GNUGo API 共通fetch（タイムアウト付き）────────────
  const fetchGnuGoApi = async (
    endpoint: "play" | "score",
    sgf: string,
  ): Promise<any | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GNU_API_TIMEOUT_MS);
    try {
      const response = await fetch(`https://gnugo-api.fly.dev/${endpoint}`, {
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
        console.error(`GNUGo API (${endpoint}) エラー:`, body);
        return null;
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.error(`GNUGo API (${endpoint}): タイムアウト`);
      } else {
        console.error(`GNUGo API (${endpoint}): 予期せぬエラー`, err);
      }
      return null;
    }
  };

  // ── 地計算（フォールバック付き）──────────────────────
  const calcTerritoryAndFinish = async () => {
    const sgf = movesToSgf(movesRef.current);
    console.log("送ったsgf: ", sgf);

    const gnuDeadStones = await fetchGnuGoApi("score", sgf);

    let stringDeadStones: string[];
    if (gnuDeadStones === null) {
      // API失敗: 死に石なしでフォールバック
      console.warn("GNUGo score API失敗: 死に石なしでフォールバック");
      stringDeadStones = [];
    } else {
      stringDeadStones = gnuGridstoStringGrids(gnuDeadStones);
      console.log("死に石の配列: ", stringDeadStones);
    }

    const { territoryBoard, result } = makeTerritoryBoard(
      boardRef.current,
      stringDeadStones,
    );
    teritoryBoardRef.current = territoryBoard;

    updateLocalPoints(result);
    await updateSupabaseMatchesTable({
      result,
      status: "ended",
      dead_stones: moveStringsToNumbers(stringDeadStones),
    });

    setLoading(false);
    setResultComment(
      resultToLanguagesComment(result, playerColor) ??
        t("Playing.matchComplete"),
    );
    setShowResult(true);
    endGameStopTimerCallRpc();
  };

  // ── GNUGoに手を送り、応答を処理する ──────────────────
  const sendSgfToGnuGo = async () => {
    const sgf = movesToSgf(movesRef.current);
    console.log("送ったsgf: ", sgf);

    const botMove = await fetchGnuGoApi("play", sgf);

    if (botMove === null) {
      // API失敗: ボットの投了扱いとしてフォールバック
      console.warn("GNUGo play API失敗: ボット投了扱いでフォールバック");
      const result = playerColor === "black" ? "B+R" : "W+R";
      setResultComment(
        resultToLanguagesComment(result, playerColor) ??
          t("Playing.matchComplete"),
      );
      setShowResult(true);
      await updateSupabaseMatchesTable({ result, status: "ended" });
      endGameStopTimerCallRpc();
      updateLocalPoints(result);
      setLoading(false);
      return;
    }

    // ── ボットが1回目のパス ──
    if (
      botMove === "PASS" &&
      movesRef.current[movesRef.current.length - 1] !== "p"
    ) {
      console.log("ボットが1回目のパス");

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

      setIsMyTurn(true);
      turn.current = playerColor;

      const now = new Date();
      await updateSupabaseMatchesTable({
        turn: playerColor,
        moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
        turn_switched_at: now,
        [`${getOppositeColor(playerColor)}_remain_seconds`]:
          opponentsRemainSecondsRef.current,
        [`${getOppositeColor(playerColor)}_last_seen`]: now,
      });
    }

    // ── ボットが2回連続パス → 地計算 ──
    else if (
      botMove === "PASS" &&
      movesRef.current[movesRef.current.length - 1] === "p"
    ) {
      console.log("ボットが2回目のパス: 地計算開始");

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

      // タイマーを先に止める
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isGameEndedRef.current = true;
      setIsGameEnded(true);
      setLoading(true);

      // パス速報だけ先に送る
      await updateSupabaseMatchesTable({
        moves: moveStringsToNumbers(movesRef.current),
      });

      await calcTerritoryAndFinish();
    }

    // ── ボットが投了 ──
    else if (botMove === "resign") {
      console.log("ボットが投了");
      const result = playerColor === "black" ? "B+R" : "W+R";
      setLoading(false);
      setResultComment(
        resultToLanguagesComment(result, playerColor) ??
          t("Playing.matchComplete"),
      );
      setShowResult(true);
      await updateSupabaseMatchesTable({ result, status: "ended" });
      endGameStopTimerCallRpc();
      updateLocalPoints(result);
    }

    // ── ボットが着手 ──
    else {
      console.log("ボットが手を打った: ", botMove);
      playStoneSound();

      const grid: Grid = keyToGrid(gnuGridtoStringGrid(botMove));
      const { board: newBoard, agehama } = applyMove(
        grid,
        cloneBoard(boardRef.current),
        getOppositeColor(playerColor),
      );

      setBoard(newBoard);
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

      setLastMove(grid);
      movesRef.current = [...movesRef.current, stringifyGrid(grid)];
      currentIndexRef.current++;

      setIsMyTurn(true);
      turn.current = playerColor;

      const now = new Date();
      opponentLastSeenRef.current = +now;
      await updateSupabaseMatchesTable({
        turn: playerColor,
        moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
        turn_switched_at: now,
        [`${getOppositeColor(playerColor)}_remain_seconds`]:
          opponentsRemainSecondsRef.current,
        [`${getOppositeColor(playerColor)}_last_seen`]: now,
      });
      setLoading(false);
    }

    // ボットの応答処理が終わったのでガードを解除
    // if (!isGameEndedRef.current) {
    //   isActionInProgressRef.current = false;
    // }
  };

  // ── 最初にやること ────────────────────────────────
  useEffect(() => {
    console.log("🔄 PlayWithBot マウント:", new Date().toISOString());
    makeMatchWithBot();
    setIsMyTurn(playerColor === "black");
    meLastSeenRef.current = Date.now();
    return () => {
      console.log("🔚 PlayWithBot アンマウント:", new Date().toISOString());
    };
  }, []);

  // ── パス ──────────────────────────────────────────
  const pass = async () => {
    if (
      !isMyTurn ||
      isGameEnded
      //  || isActionInProgressRef.current
    )
      return;
    // isActionInProgressRef.current = true;

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
      meLastSeenRef.current = +now;

      await updateSupabaseMatchesTable({
        turn: getOppositeColor(playerColor),
        moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
        turn_switched_at: now,
        [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
        [`${playerColor}_last_seen`]: now,
      });

      // sendSgfToGnuGo の内部でガード解除する
      sendSgfToGnuGo();
    } else {
      // 2回目のパス → 地計算（自分が2回目）
      console.log("2回目のパス: 地計算開始");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isGameEndedRef.current = true;
      setIsGameEnded(true);
      setLoading(true);

      await updateSupabaseMatchesTable({
        moves: moveStringsToNumbers(movesRef.current),
      });

      await calcTerritoryAndFinish();
      // ガードはendGameStopTimerCallRpc内でリセット済み
    }
  };

  // ── 投了 ──────────────────────────────────────────
  const resign = async () => {
    if (
      !isMyTurn ||
      isGameEnded
      //  || isActionInProgressRef.current
    )
      return;
    // isActionInProgressRef.current = true;

    setIsMyTurn(false);
    turn.current = getOppositeColor(playerColor);

    const result = `${playerColor === "black" ? "W" : "B"}+R`;
    console.log("投了:", result);

    const success = await updateSupabaseMatchesTable({
      result,
      status: "ended",
    });
    if (!success) {
      // 送信失敗 → 操作を戻す
      console.error("投了送信失敗: 操作を戻します");
      setIsMyTurn(true);
      turn.current = playerColor;
      // isActionInProgressRef.current = false;
      return;
    }

    setResultComment(
      resultToLanguagesComment(result, playerColor) ??
        t("Playing.matchComplete"),
    );
    setShowResult(true);
    endGameStopTimerCallRpc();
    updateLocalPoints(result);
  };

  // ── 着手 ──────────────────────────────────────────
  const handlePutStone = async (grid: Grid) => {
    if (
      !isMyTurn ||
      isGameEnded
      //  || isActionInProgressRef.current
    )
      return;

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

    // isActionInProgressRef.current = true;

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
    meLastSeenRef.current = +now;

    await updateSupabaseMatchesTable({
      turn: getOppositeColor(playerColor),
      moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
      turn_switched_at: now,
      [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
      [`${playerColor}_last_seen`]: now,
    });

    // sendSgfToGnuGo の内部でガード解除する
    sendSgfToGnuGo();
  };

  // ── 結果OKボタン ──────────────────────────────────
  const onPressOK = () => {
    console.log("OK pressed");
    setShowResult(false);
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
          gumiIndex={botGumiIndex ?? 0}
          iconIndex={botIconIndex ?? 0}
          username={botUserName || ""}
          displayname={botDisplayName || ""}
          points={botPoints || 0}
          color={getOppositeColor(playerColor)}
          time={opponentsRemainSecondsDisplay}
          isActive={true}
        />

        <GoBoardWithReplay
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
          points={point || 0}
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
