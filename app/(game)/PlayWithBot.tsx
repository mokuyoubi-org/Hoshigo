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
  // SetAcquiredIconIndicesContext,
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

export default function PlayWithBot() {
  const { t } = useTranslation();

  // global state
  const uid = useContext(UidContext);

  const jwt = useContext(JwtContext);
  const myUserName = useContext(UserNameContext);
  const myDisplayName = useContext(DisplayNameContext);
  const point = useContext(PointsContext);
  const setPoints = useContext(SetPointsContext);
  const iconIndex = useContext(IconIndexContext);
  const gumiIndex = useContext(GumiIndexContext);
  const setGumiIndex = useContext(SetGumiIndexContext);
  // const setAcquiredIconIndices = useContext(SetAcquiredIconIndicesContext);

  const dailyPlayCount = useContext<number | null>(DailyPlayCountContext);
  const setDailyPlayCount = useContext(SetDailyPlayCountContext);

  // local state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<Color>("black");

  // ボット情報
  const [botUserName, setBotUserName] = useState<string | null>(null);
  const [botDisplayName, setBotDisplayName] = useState<string | null>(null);
  const [botPoints, setBotPoints] = useState<number | null>(null);
  const [botUid, setBotUid] = useState<string | null>(null);
  const [botIconIndex, setBotIconIndex] = useState<number | null>(null);
  const [botGumiIndex, setBotGumiIndex] = useState<number | null>(null);

  //
  const isTryingRef = useRef<boolean>(false);
  const myIconIndex = useContext(IconIndexContext);

  // State: board系
  const [board, setBoard] = useState<Board>(initializeBoard()); // 現在の表示盤面。大事
  const boardRef = useRef<Board>(initializeBoard()); // 現在の盤面
  const boardHistoryRef = useRef<Board[]>([initializeBoard()]); // 盤面のhistory
  const teritoryBoardRef = useRef<number[][]>( // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
    Array.from({ length: BOARD_SIZE_COUNT }, () =>
      Array.from({ length: BOARD_SIZE_COUNT }, () => 0),
    ),
  );

  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);

  // State: move系
  const [lastMove, setLastMove] = useState<Grid | null>(null); // 最後の手。
  const movesRef = useRef<string[]>([]); // 手のhistory

  // State: 時間系
  const [isMyTurn, setIsMyTurn] = useState<boolean | null>(null); // 自分の番かどうか。
  const turn = useRef<"black" | "white">("black"); // 不要だと思ったが、useEffectの中で使われているので必要だった。
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null); // タイマーのidが入ってる。

  const myRemainSecondsRef = useRef(180); // 自分の残り時間
  const opponentsRemainSecondsRef = useRef(180); // 相手の残り時間
  const [myRemainSecondsDisplay, setMyRemainingSecondsDisplay] = useState(180);
  const [opponentsRemainSecondsDisplay, setOpponentsRemainingSecondsDisplay] =
    useState(180);
  // const turnSwitchedAtRef = useRef(Date.now()); // 交代した時間。これは、接続復帰のためにsupabase上には必要だけど、こっちには別にいらない。
  const meLastSeenRef = useRef(Date.now()); // 自分が、着手なりハートビートなりで最後に通信した時間。
  const opponentLastSeenRef = useRef(Date.now()); // 相手が、着手なりハートビートなりで最後に通信した時間。

  // State: 結果表示とリプレイ
  const [resultComment, setResultComment] = useState<string | null>(null); // 結果のコメント。
  const [showResult, setShowResult] = useState(false); // 結果を表示するか否か。
  const [isGameEnded, setIsGameEnded] = useState(false); // ゲームが終わったかどうか。
  const currentIndexRef = useRef<number>(0); // リプレイモードの時、今何手目か。
  // リプレイインデックス変更時のハンドラ
  const handleCurrentIndexChange = (newIndex: number) => {
    currentIndexRef.current = newIndex;
    setBoard(boardHistoryRef.current[newIndex]); // ★重要
    boardRef.current = boardHistoryRef.current[newIndex];
    // インデックスを変えただけなのでhistoryはいじらない
  };
  // const [isReplayMode, setIsReplayMode] = useState(false); // リプレイモードか否か。
  const [loading, setLoading] = useState(false); // 地計算待ち。

  const pointsBeforeRef = useRef<number | null>(null);
  const pointsAfterRef = useRef<number | null>(null);
  const gumiIndexBeforeRef = useRef<number | null>(null);

  const gumiIndexAfterRef = useRef<number | null>(null);

  const updateLocalPoints = (result: string) => {
    // 格上のボットに負けてもレート下がらないようにする

    // pointsBeforeRef
    // pointsAfterRef
    // gumiIndexBeforeRef
    // gumiIndexAfterRef
    // この4つを正確に用意する責任がある。
    // Context ガード
    if (
      point === null ||
      setPoints === null ||
      botPoints === null ||
      setGumiIndex === null ||
      gumiIndex === null
      // ||
      // setAcquiredIconIndices === null
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

    // レート差を計算（自分 - 相手）
    const diff = point - botPoints;

    // 勝った場合と負けた場合で異なるdeltaを計算
    let delta: number;
    if (isWin) {
      // 勝った場合：相手が強いほど多く獲得（diffが負ならdeltaが大きくなる）
      delta = Math.max(0, Math.min(10, 5 - Math.trunc(diff / 50)));
    } else {
      // 負けた場合：相手が弱いほど多く失う（diffが正ならdeltaが大きくなる）
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
    console.log("元々のgumiIndex: ", gumiIndex);

    let tempGumiIndex = pointsToGumiIndex(newPoint);
    if (tempGumiIndex > gumiIndex) {
      // 昇格
      gumiIndexAfterRef.current = tempGumiIndex;
      setGumiIndex(tempGumiIndex);
      // setAcquiredIconIndices(
      //   Array.from({ length: tempGumiIndex + 1 }, (_, i) => i),
      // );
    } else {
      gumiIndexAfterRef.current = gumiIndex;
      setGumiIndex(gumiIndex);
    }
    console.log("新しいgumiIndex: ", gumiIndexAfterRef.current);
  };

  // Supabaseのmatchesテーブルを更新
  const updateSupabaseMatchesTable = async (updateData: object) => {
    if (matchId) {
      const { data, error } = await supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId)
        .select();
      if (error) {
        console.log("updateSupabaseMatchTable/エラー", error);
      }
    }
  };

  const callRpc = async () => {
    await sleep(1000); // 1秒待つ(statusがendになるのを待ってからarchiveに移動させる)
    try {
      const { data, error } = await supabase.rpc("move_match_to_archive", {
        match_id: matchId,
      });
      if (error) {
        console.error("アーカイブ移動に失敗しました:", error);
      } else {
        console.log("アーカイブ移動成功:", data);
      }
    } catch (err) {
      console.error("予期せぬエラー:", err);
    }
  };

  // 対局終了処理
  const endGameStopTimerCallRpc = async () => {
    setIsGameEnded(true);
    // タイマーを停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    callRpc();
  };

  // 時間の処理
  useEffect(() => {
    // 時間切れ負け
    const loseByTimeout = async () => {
      setIsMyTurn(false);
      turn.current = getOppositeColor(playerColor);
      const opponentsLetter = playerColor === "black" ? "W" : "B";
      const result = `${opponentsLetter}+T`;
      updateSupabaseMatchesTable({
        // 時間切れ負けを宣言。
        result,
        status: "ended",
      });
      setResultComment(
        resultToLanguagesComment(result, playerColor) ||
          t("Playing.matchComplete"),
      );
      setShowResult(true);
      endGameStopTimerCallRpc(); // 自分の時間切れ負け
      updateLocalPoints(result);
    };

    if (!isGameEnded) {
      timerRef.current = setInterval(() => {
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
          }
        }

        if (Date.now() - meLastSeenRef.current > 10000) {
          const now = new Date();
          updateSupabaseMatchesTable({
            // ハートビートを送った
            [`${playerColor}_last_seen`]: now,
            [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
            moves: moveStringsToNumbers(movesRef.current), //念の為10秒に一回は送る
          });

          meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ
          console.log(
            "ハートビートを送ったよ: meLastSeenRef.current: ",
            meLastSeenRef.current,
          );
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const soundFile = require("../../assets/sounds/stone.mp3");

  // 石の音用のプレイヤーを作る
  const stonePlayer = useAudioPlayer(soundFile);

  const playStoneSound = () => {
    stonePlayer.seekTo(0); // 最初に戻す
    stonePlayer.play(); // 鳴らす
  };

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
      console.log("🎮 match_with_bot RPC 実行:", new Date().toISOString()); // ← ★ ログ追加

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
        isTryingRef.current = false; // ← ★ エラー時にリセット（finally で自動だが明示的に）

        return;
      }

      const res = data[0];
      if (!res) {
        console.log("RPCから送られてきたデータはありません");
        isTryingRef.current = false; // ← ★ データなし時にリセット

        return;
      }
      console.log("✅ ボットとのマッチ作成成功:", res.match_id); // ← ★ ログ追加

      //       returns table (
      //   match_id uuid,
      //   bot_uid uuid,
      //   bot_displayname text,
      //   bot_points integer,
      //   bot_icon_index integer
      // )

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

  // もう、全部やってもらう。
  // 1. sgfをgnugoに送り手を受け取る
  // 2. 受け取った手をapplymovesして自分のターンにするか、投了(R)ならそれに応じた処理。TとCはあり得ない。
  const sendSgfToGnuGo = async () => {
    const response = await fetch("https://gnugo-api.fly.dev/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ sgf: movesToSgf(movesRef.current) }),
    });
    console.log("送ったsgf: ", movesToSgf(movesRef.current));

    const botMove = await response.json(); // deadStonesは死に石の配列

    if (!response.ok) {
      console.error("エラーです");
    } else {
      // ボットが一回目のパス
      if (
        botMove === "PASS" &&
        movesRef.current[movesRef.current.length - 1] !== "p"
      ) {
        // ボットが1回目のパス
        console.log("ボットが1回目のパス: ", botMove);

        movesRef.current = [...movesRef.current, "p"]; // パスをしたので更新
        currentIndexRef.current++;
        setLastMove({ row: 0, col: 0 });
        boardHistoryRef.current = [
          ...boardHistoryRef.current,
          cloneBoard(boardRef.current),
        ];
        // アゲハマ更新。boardHistoryRefとagehamaHistoryRefはセット
        const last =
          agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
        agehamaHistoryRef.current.push({ ...last });
        setAgehamaHistory(agehamaHistoryRef.current);

        // 手番交代
        setIsMyTurn(true);
        turn.current = playerColor;

        const now = new Date();
        updateSupabaseMatchesTable({
          // ボットが一回目のパスをした
          turn: playerColor,
          moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
          turn_switched_at: now,
          [`${getOppositeColor(playerColor)}_remain_seconds`]:
            myRemainSecondsRef.current,
          [`${getOppositeColor(playerColor)}_last_seen`]: now,
        });
      }

      // ボットが2回連続目のパス
      else if (
        botMove === "PASS" &&
        movesRef.current[movesRef.current.length - 1] === "p"
      ) {
        // ボットが2回目のパス
        console.log("ボットが2回目のパス: ", botMove);

        movesRef.current = [...movesRef.current, "p"]; // パスをしたので更新
        currentIndexRef.current++;
        setLastMove({ row: 0, col: 0 });
        boardHistoryRef.current = [
          ...boardHistoryRef.current,
          cloneBoard(boardRef.current),
        ];
        // アゲハマ更新。boardHistoryRefとagehamaHistoryRefはセット
        const last =
          agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
        agehamaHistoryRef.current.push({ ...last });
        setAgehamaHistory(agehamaHistoryRef.current);
        // ボットが二回目のパスをした

        // タイマーを停止
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsGameEnded(true);
        setLoading(true);
        updateSupabaseMatchesTable({
          // パス速報: 地計算で待たせるのでとりあえず観客にパスだけ先に伝えておく
          moves: moveStringsToNumbers(movesRef.current),
        });

        const response = await fetch("https://gnugo-api.fly.dev/score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ sgf: movesToSgf(movesRef.current) }),
        });
        console.log("送ったsgf: ", movesToSgf(movesRef.current));

        const gnuDeadStones = await response.json(); // deadStonesは死に石の配列
        const stringDeadStones: string[] = gnuGridstoStringGrids(gnuDeadStones);

        if (!response.ok) {
          console.error("死に石の配列のエラー:", gnuDeadStones.error);
        } else {
          console.log("死に石の配列: ", stringDeadStones);
          const { territoryBoard, result } = makeTerritoryBoard(
            boardRef.current,
            stringDeadStones,
          );
          teritoryBoardRef.current = territoryBoard;
          console.log("送る側");
          console.log("処理に使ったboardRef.current: ", boardRef.current);
          console.log("処理に使ったdeadStones: ", stringDeadStones);
          console.log(
            "結果であるteritoryBoardRef.current: ",
            teritoryBoardRef.current,
          );
          updateLocalPoints(result);

          updateSupabaseMatchesTable({
            // 自分がパスし、ボットがパスした。地計算結果を送る
            result: result,
            status: "ended",
            dead_stones: moveStringsToNumbers(stringDeadStones),
          });
          setLoading(false);

          setResultComment(
            resultToLanguagesComment(result, playerColor) || "対局終了",
          );
          setShowResult(true);

          endGameStopTimerCallRpc();
        }
      } else if (botMove === "resign") {
        // ボットが投了
        const result = "B+R"; // 対局者の勝ち
        console.log("ボットが投了しました");

        // 終局時だけ値が入るがそれまではずっとnullなのでfalseになってくれる
        setLoading(false);
        setResultComment(
          resultToLanguagesComment(result, playerColor) || "対局終了",
        );
        setShowResult(true);
        updateSupabaseMatchesTable({
          // ボットが投了した
          result,
          status: "ended",
        });
        endGameStopTimerCallRpc();
        updateLocalPoints(result);
      } else {
        // ボットが手を打った
        console.log("ボットが手を打った: ", botMove);

        playStoneSound(); // 音
        const grid: Grid = keyToGrid(gnuGridtoStringGrid(botMove));

        const { board: newBoard, agehama: agehama } = applyMove(
          grid,
          cloneBoard(boardRef.current),
          getOppositeColor(playerColor),
        );

        setBoard(newBoard);
        boardRef.current = newBoard;
        boardHistoryRef.current = [...boardHistoryRef.current, newBoard];
        // ⭐️アゲハマ追加する
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
        setAgehamaHistory(agehamaHistoryRef.current);

        setLastMove(grid);

        movesRef.current = [...movesRef.current, stringifyGrid(grid)]; // 手を打ったので更新
        currentIndexRef.current++;

        setIsMyTurn(true);
        turn.current = playerColor;

        const now = new Date();
        opponentLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ

        updateSupabaseMatchesTable({
          // ボットが手を打った
          turn: playerColor,
          moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
          turn_switched_at: now,
          [`${getOppositeColor(playerColor)}_remain_seconds`]:
            myRemainSecondsRef.current,
          [`${getOppositeColor(playerColor)}_last_seen`]: now,
        });
        setLoading(false);
      }
    }
  };

  // 最初にやること
  useEffect(() => {
    console.log("🔄 PlayWithBot マウント:", new Date().toISOString()); // ← ★ ログ追加

    // ボットとの対局の流れ：まず、マッチを作る。

    makeMatchWithBot();

    // 一番最初のみ
    setIsMyTurn(playerColor === "black" ? true : false);
    // 一番最初のみ
    const now = new Date();

    meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ
    return () => {
      // ← ★ クリーンアップ追加
      console.log("🔚 PlayWithBot アンマウント:", new Date().toISOString());
    };
  }, []);

  // パス
  const pass = async () => {
    if (!isMyTurn) return;
    // playStoneSound(); // 音
    movesRef.current = [...movesRef.current, "p"]; // パスをしたので更新
    currentIndexRef.current++;
    setLastMove({ row: 0, col: 0 });
    boardHistoryRef.current = [
      ...boardHistoryRef.current,
      cloneBoard(boardRef.current),
    ];
    // アゲハマ更新。boardHistoryRefとagehamaHistoryRefはセット
    const last =
      agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
    agehamaHistoryRef.current.push({ ...last });
    setAgehamaHistory(agehamaHistoryRef.current);

    // 手番交代
    setIsMyTurn(false);
    turn.current = getOppositeColor(playerColor);

    if (movesRef.current[movesRef.current.length - 2] !== "p") {
      console.log("１回目のパス");
      const now = new Date();
      myRemainSecondsRef.current++; // 自分がパス。1秒プラス
      setMyRemainingSecondsDisplay(myRemainSecondsRef.current);

      updateSupabaseMatchesTable({
        // 自分が一回目のパスをした
        turn: getOppositeColor(playerColor),
        moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
        turn_switched_at: now,
        [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
        [`${playerColor}_last_seen`]: now,
      });
      meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ

      sendSgfToGnuGo();
    } else {
      // 自分が２回目のパスをした
      // タイマーを停止
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGameEnded(true);
      setLoading(true);

      updateSupabaseMatchesTable({
        // パス速報: 地計算で待たせるのでとりあえずパスだけ先に伝えておく
        moves: moveStringsToNumbers(movesRef.current),
      });

      const response = await fetch("https://gnugo-api.fly.dev/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ sgf: movesToSgf(movesRef.current) }),
      });
      console.log("送ったsgf: ", movesToSgf(movesRef.current));

      const gnuDeadStones = await response.json(); // deadStonesは死に石の配列
      const stringDeadStones: string[] = gnuGridstoStringGrids(gnuDeadStones);

      if (!response.ok) {
        console.error("死に石の配列のエラー:", gnuDeadStones.error);
      } else {
        console.log("死に石の配列: ", stringDeadStones);
        const { territoryBoard, result } = makeTerritoryBoard(
          boardRef.current,
          stringDeadStones,
        );
        teritoryBoardRef.current = territoryBoard;
        console.log("送る側");
        console.log("処理に使ったboardRef.current: ", boardRef.current);
        console.log("処理に使ったdeadStones: ", stringDeadStones);
        console.log(
          "結果であるteritoryBoardRef.current: ",
          teritoryBoardRef.current,
        );
        updateLocalPoints(result);

        updateSupabaseMatchesTable({
          // ボットがパスし、自分がパスした。地計算結果を送る
          result: result,
          status: "ended",
          dead_stones: moveStringsToNumbers(stringDeadStones),
        });
        setLoading(false);
        endGameStopTimerCallRpc();

        setResultComment(
          resultToLanguagesComment(result, playerColor) || "対局終了",
        );
        setShowResult(true);
      }
    }
  };

  // 投了
  const resign = async () => {
    if (!isMyTurn) return;
    // playStoneSound(); // 音
    // 手番交代
    setIsMyTurn(false);
    turn.current = getOppositeColor(playerColor);

    const result = `${playerColor === "black" ? "W" : "B"}+R`;
    console.log("投了を送ったよ");
    updateSupabaseMatchesTable({
      // 自分が投了した
      result,
      status: "ended",
    });

    setResultComment(
      resultToLanguagesComment(result, playerColor) || "対局終了",
    );
    setShowResult(true);
    endGameStopTimerCallRpc();
    updateLocalPoints(result);
  };

  // 着手
  const handlePutStone = async (grid: Grid) => {
    if (!isMyTurn) return;

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

    playStoneSound(); // 音
    const { board: newBoard, agehama: agehama } = applyMove(
      grid,
      cloneBoard(boardRef.current),
      playerColor,
    );

    setBoard(newBoard);
    boardRef.current = newBoard;
    boardHistoryRef.current = [...boardHistoryRef.current, newBoard];
    // ⭐️アゲハマ追加する
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
    setAgehamaHistory(agehamaHistoryRef.current);

    setLastMove(grid);

    movesRef.current = [...movesRef.current, stringifyGrid(grid)]; // 手を打ったので更新
    currentIndexRef.current++;

    setIsMyTurn(false);
    turn.current = getOppositeColor(playerColor);

    console.log(
      "手を打ったよ: ",
      movesRef.current[movesRef.current.length - 1],
    );
    const now = new Date();
    myRemainSecondsRef.current++; // 自分が手を打った。1秒プラス
    setMyRemainingSecondsDisplay(myRemainSecondsRef.current);

    updateSupabaseMatchesTable({
      // 手を打った
      turn: getOppositeColor(playerColor),
      moves: moveStringsToNumbers(movesRef.current, BOARD_SIZE_COUNT),
      turn_switched_at: now,
      [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
      [`${playerColor}_last_seen`]: now,
    });

    meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ

    sendSgfToGnuGo();
  };

  const onPressOK = () => {
    console.log("OK pressed");
    console.log(
      "boardHistoryRef.current.length:",
      boardHistoryRef.current.length,
    );
    console.log("Setting replayIndex to:", boardHistoryRef.current.length - 1);
    setShowResult(false);
    // setIsReplayMode(true);
    const finalIndex = boardHistoryRef.current.length - 1;
    currentIndexRef.current = finalIndex;
    setBoard(boardHistoryRef.current[finalIndex]);
    boardRef.current = boardHistoryRef.current[finalIndex];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {/* 戻るボタン（終局後のみ表示） */}
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

        {/* 結果ボタン（終局後のみ表示） */}
        {isGameEnded && (
          <View style={styles.resultButtonContainer}>
            <TouchableOpacity
              style={styles.resultButton}
              onPress={() => {
                setShowResult(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.resultButtonText}>{t("Playing.result")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 相手の情報 */}
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

        {/* 碁盤 */}
        <GoBoardWithReplay
          agehamaHistory={agehamaHistory}
          board={board}
          onPutStone={handlePutStone}
          moveHistory={movesRef.current}
          territoryBoard={teritoryBoardRef.current}
          disabled={!isMyTurn}
          isGameEnded={isGameEnded} // ★切り替えのキー
          boardHistory={boardHistoryRef.current}
          currentIndex={currentIndexRef.current}
          onCurrentIndexChange={handleCurrentIndexChange}
        />

        {/* 自分の情報 */}
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

        {/* パス・投了ボタン */}
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

      {/* 結果モーダル */}
      <ResultModal
        visible={showResult}
        resultComment={resultComment ?? ""}
        onPressOK={onPressOK}
        // pointsBefore={pointsBeforeRef.current ?? 1000}
        // pointsAfter={pointsAfterRef.current ?? 1000}
        pointsBefore={pointsBeforeRef.current ?? 0}
        pointsAfter={pointsAfterRef.current ?? 0}
        gumiIndexBefore={gumiIndexBeforeRef.current ?? 0}
        gumiIndexAfter={gumiIndexAfterRef.current ?? 0}
      />

      {/* ← ここがLoadingオーバーレイ */}
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
