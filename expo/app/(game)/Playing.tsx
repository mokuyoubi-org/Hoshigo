// Playing.tsx
import { AgehamaDisplay } from "@/src/components/GoComponents/Agehama";
import { Avatar } from "@/src/components/GoComponents/Avatar";
import { GoBoard } from "@/src/components/GoComponents/GoBoard";
import { Pass } from "@/src/components/GoComponents/Pass";
import { DailyLimitModal } from "@/src/components/Modals/DailyLimitModal";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import { ResultModal } from "@/src/components/Modals/ResultModal";
import { Agehama } from "@/src/constants/goConstants";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import {
  DisplaynameContext,
  GumiIndexContext,
  IconIndexContext,
  PointsContext,
  UidContext,
} from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import {
  applyMove,
  Board,
  cloneBoard,
  Color,
  Grid,
  initializeBoard,
  isLegalMove,
  stringifyGrid,
  stringToGrid,
} from "@/src/lib/goLogics";
import {
  gridToInt,
  intArrayToStringArray,
  intToGrid,
  makeTerritoryBoard,
  prepareOkigoBoard,
  resultToSelfComment,
  secondsToMinutes,
} from "@/src/lib/goUtils";
import { wrapBotDisplayname } from "@/src/lib/utils";
import {
  clearGameChannel,
  clearUserChannel,
  game_finished_ref,
  game_move_ref,
  user_finished_ref,
} from "@/src/services/gameChannel";
import { supabase } from "@/src/services/supabase";
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Playing() {
  const { t } = useTranslation();
  const { height, width } = useWindowDimensions();
  const uid = useContext(UidContext);
  const { points, setPoints } = useContext(PointsContext)!;
  const { gumiIndex, setGumiIndex } = useContext(GumiIndexContext)!;
  const { iconIndex, setIconIndex } = useContext(IconIndexContext)!;
  const { displayname, setDisplayname } = useContext(DisplaynameContext)!;
  const { colors } = useTheme();
  // ─── パラメータ ───────────────────────────────────────
  type Params = {
    matchId: string; // マッチid
    matchType: string; // マッチのタイプ
    moves: string; // moves
    myColor: Color; // 自分の色
    oppDisplayname: string; // 相手の表示名
    oppGumiIndex: string; // 相手のぐみ
    oppIconIndex: string; // 相手のアイコン
    mySeconds: string; // 自分の残り秒数
    oppSeconds: string; // 相手の残り秒数
  };
  const params = useLocalSearchParams<Params>();
  const matchId = Number(params.matchId); // マッチid
  const matchType = Number(params.matchType ?? 0); // マッチのタイプ
  const movesInt: number[] = JSON.parse(params.moves); // move
  const myColor: Color = params.myColor;
  const oppColor: Color = myColor === "white" ? "black" : "white";
  const oppDisplayname = wrapBotDisplayname(params.oppDisplayname, t);
  const oppGumiIndex = Number(params.oppGumiIndex);
  const oppIconIndex = Number(params.oppIconIndex);
  const [mySeconds, setMySeconds] = useState(Number(params.mySeconds));
  const [oppSeconds, setOppSeconds] = useState(Number(params.oppSeconds));

  // ─── 盤面 State ───────────────────────────────────────
  const buildInitialState = () => {
    let board =
      matchType >= 2 ? prepareOkigoBoard(matchType, 9) : initializeBoard(9);

    const firstTurn: Color = matchType >= 2 ? "white" : "black";
    const colors: Color[] =
      firstTurn === "black" ? ["black", "white"] : ["white", "black"];

    const agehamaHistory: Agehama[] = [{ black: 0, white: 0 }];
    const boardHistory: Board[] = [cloneBoard(board)];
    const moves: string[] = [];
    let lastMoveGrid: Grid | null = null;

    for (let i = 0; i < movesInt.length; i++) {
      const moveInt = movesInt[i];
      const color = colors[i % 2];
      const last = agehamaHistory[agehamaHistory.length - 1];
      if (moveInt === -1) {
        moves.push("p");
        boardHistory.push(cloneBoard(board));
        agehamaHistory.push({ ...last });
        lastMoveGrid = { row: 0, col: 0 };
      } else {
        const grid = intToGrid(moveInt);
        const { board: newBoard, agehama } = applyMove(
          9,
          grid,
          cloneBoard(board),
          color,
        );
        board = newBoard;
        boardHistory.push(cloneBoard(board));
        moves.push(stringifyGrid(grid));
        agehamaHistory.push(
          color === "black"
            ? { ...last, black: last.black + agehama }
            : { ...last, white: last.white + agehama },
        );
        lastMoveGrid = grid;
      }
    }

    const currentTurn: Color = colors[movesInt.length % 2];
    return {
      board,
      boardHistory,
      moves,
      agehamaHistory,
      currentTurn,
      lastMoveGrid,
    };
  };

  const initialState = buildInitialState();

  const [board, setBoard] = useState<Board>(initialState.board);
  const boardRef = useRef<Board>(initialState.board);
  const boardHistoryRef = useRef<Board[]>(initialState.boardHistory);
  const territoryBoardRef = useRef<number[][]>(
    Array.from({ length: 9 }, () => Array(9).fill(0)),
  );
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>(
    initialState.agehamaHistory,
  );
  const agehamaHistoryRef = useRef<Agehama[]>(initialState.agehamaHistory);
  const movesRef = useRef<string[]>(initialState.moves);
  const [lastMove, setLastMove] = useState<Grid | null>(
    initialState.lastMoveGrid,
  );
  const currentIndexRef = useRef<number>(initialState.moves.length);

  // ─── 時間・手番 State ─────────────────────────────────
  const [isMyTurn, setIsMyTurn] = useState<boolean>(
    myColor === initialState.currentTurn,
  );
  const turnRef = useRef<"black" | "white">(initialState.currentTurn);
  const mySecondsRef = useRef(180);
  const oppSecondsRef = useRef(180);

  // ─── 結果 State ───────────────────────────────────────
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [resultComment, setResultComment] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  //
  const [pointsBefore, setPointsBefore] = useState(0);
  const [gumiIndexBefore, setGumiIndexBefore] = useState(0);
  const [pointsAfter, setPointsAfter] = useState(0);
  const [gumiIndexAfter, setGumiIndexAfter] = useState(0);

  // ─── タイマー ─────────────────────────────────────────
  // 表示用のタイマー
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ハートビート用のタイマー
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 音 ──────────────────────────────────────────────
  const soundFile = require("@/assets/sounds/stone.mp3");
  const stonePlayer = useAudioPlayer(soundFile);
  const playStoneSound = () => {
    stonePlayer.seekTo(0);
    stonePlayer.play();
  };

  //

  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);

  const currentMove = movesRef.current[currentIndexRef.current - 1];
  const isCurrentMovePass = currentMove === "p";
  const isBlackPass =
    isCurrentMovePass &&
    ((currentIndexRef.current % 2 === 1 &&
      (matchType === 0 || matchType === 1)) ||
      (currentIndexRef.current % 2 === 0 &&
        matchType !== 0 &&
        matchType !== 1));
  const isWhitePass =
    isCurrentMovePass &&
    ((currentIndexRef.current % 2 === 0 &&
      (matchType === 0 || matchType === 1)) ||
      (currentIndexRef.current % 2 === 1 &&
        matchType !== 0 &&
        matchType !== 1));

  const boardWidth = Math.min(width * 0.82, height * 0.5);

  // ─── gameチャンネルのmoveイベント: 対局中の盤面情報 ──────────────────────────
  // 受け取るもの:
  // move: 最新の手。intとして受け取る
  // move_count: 手数の長さ。これで相手の新たな手か自分の手かを判断
  // turn: 今どちらの番か。"black"もしくは"white"
  // black_seconds: 黒の残り秒数。これがmyでないのは仕方ない。両者、さらには観客にまで配られるから。
  // white_seconds: 白の残り秒数。同上。
  const game_move = useCallback(
    (payload: any) => {
      if (isGameEnded) return;

      const data = payload.payload ?? payload;

      // パスまたは着手を受け取った
      const moveRaw: number = data.move;
      const moveCount: number = data.move_count;
      const move = intArrayToStringArray([moveRaw])[0];

      const isNewMove = moveCount === movesRef.current.length + 1;
      const isMyOwnMove = moveCount === movesRef.current.length;

      if (!isNewMove && !isMyOwnMove) return;

      // secondsは常に更新（自分の手でも相手の手でも）
      mySecondsRef.current =
        myColor === "black"
          ? Number(data.black_seconds)
          : Number(data.white_seconds);
      oppSecondsRef.current =
        myColor === "black"
          ? Number(data.white_seconds)
          : Number(data.black_seconds);
      setMySeconds(mySecondsRef.current);
      setOppSeconds(oppSecondsRef.current);

      if (!isNewMove) return; // 自分の手のbroadcastはここで終了

      const isTurnFlipped = data.turn === myColor;

      if (isTurnFlipped) {
        if (move === "p") {
          // パス
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
          // 着手
          const grid = stringToGrid(move);
          const { board: newBoard, agehama } = applyMove(
            9,
            grid,
            cloneBoard(boardRef.current),
            oppColor,
          );
          setBoard(newBoard);
          boardRef.current = newBoard;
          boardHistoryRef.current = [...boardHistoryRef.current, newBoard];
          movesRef.current = [...movesRef.current, stringifyGrid(grid)];
          currentIndexRef.current++;
          setLastMove(grid);

          const lastAgehama =
            agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
          agehamaHistoryRef.current.push(
            oppColor === "black"
              ? { ...lastAgehama, black: lastAgehama.black + agehama }
              : { ...lastAgehama, white: lastAgehama.white + agehama },
          );
          setAgehamaHistory([...agehamaHistoryRef.current]);
        }

        setIsMyTurn(true);
        turnRef.current = myColor;
        return;
      }
    },
    [isGameEnded, myColor, oppColor, matchType, t],
  );

  // ─── gameチャンネルのfinishedイベント: 終局後の盤面情報 ──────────────────────────
  // 受け取るもの:
  // result: 結果。
  // dead_stones: 死に石の配列。
  const game_finished = useCallback((payload: any) => {
    const data = payload.payload ?? payload;

    setLoading(false);
    const result: string = data.result;
    const suffix = result[2];
    const deadStones = intArrayToStringArray(data.dead_stones ?? []);

    if (suffix !== "R" && suffix !== "T" && suffix !== "C") {
      const tb = makeTerritoryBoard(
        9,
        boardRef.current,
        deadStones,
        matchType,
        agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1].black,
        agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1].white,
      ).territoryBoard;
      territoryBoardRef.current = tb;
    }

    setResultComment(
      resultToSelfComment(result, myColor, t) ?? t("common.matchComplete"),
    );

    // ゲーム系の処理はここに書こう
    // ゲーム終了
    setIsGameEnded(true);
    // 表示用タイマー停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // ハートビートタイマー停止
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    // ゲームチャンネルサブスク解除
    clearGameChannel();
    return;
  }, []);

  // ─── userチャンネルのfinishedイベント: 終局後のユーザ情報 ──────────────────────────
  // 受け取るもの:
  // delta: 何ポイント下がったか、上がったか
  // new_points: 対局後のポイント
  // new_gumi_index: 対局後のぐみ
  // new_acquired_icons: 新たに獲得したアイコンの配列。なければ空配列
  const user_finished = useCallback((payload: any) => {
    const data = payload.payload ?? payload;

    setLoading(false);

    // points / gumiIndex を更新
    const newPoints = Number(data.new_points);
    const newGumiIndex = Number(data.new_gumi_index);

    setPointsAfter(newPoints);
    setGumiIndexAfter(newGumiIndex);
    setPoints?.(newPoints); // グローバルstate
    setGumiIndex?.(newGumiIndex); // グローバルstate
    // 結果モーダルの表示
    console.log("setShowResult");
    setShowResult(true);
    // ユーザチャンネルサブスク解除
    clearUserChannel();
    return;
  }, []);

  // ─── 初期化 ───────────────────────────────────────────
  // 一番最初に行うこと
  useEffect(() => {
    if (!matchId) {
      router.replace("/(tabs)/Home");
    }

    setPointsBefore(points ?? 0);
    setGumiIndexBefore(gumiIndex ?? 0);
  }, [matchId]);

  // このページを去った時にすること
  useEffect(() => {
    return () => {
      clearGameChannel();
      clearUserChannel();
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, []);

  // gameチャンネルのmoveイベント
  useEffect(() => {
    game_move_ref.current = game_move;
    return () => {
      game_move_ref.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game_move]);

  // gameチャンネルのfinishedイベント
  useEffect(() => {
    game_finished_ref.current = game_finished;
    return () => {
      game_finished_ref.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game_finished]);

  // userチャンネルのfinishedイベント
  useEffect(() => {
    user_finished_ref.current = user_finished;

    return () => {
      user_finished_ref.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user_finished]);

  // タイマー開始
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isGameEnded) return;

      if (turnRef.current !== myColor) {
        oppSecondsRef.current = Math.max(0, oppSecondsRef.current - 1);
        setOppSeconds(oppSecondsRef.current);
        return;
      }

      mySecondsRef.current = Math.max(0, mySecondsRef.current - 1);
      setMySeconds(mySecondsRef.current);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameEnded]);

  // ハートビート開始
  useEffect(() => {
    const HEARTBEAT_INTERVAL_MS = 10_000;

    const gameChannel = supabase.channel(`game:${matchId}`);

    // ─── ハートビート開始 ─────────────────────
    // 10秒ごとにtrack() + RPCでlast_seenをDBに書き込む。
    // RPCがclaim_disconnect_winの正当性検証に使う。
    const sendHeartbeat = async () => {
      if (!gameChannel) return;
      const now = new Date().toISOString();

      // Presenceを更新（相手のクライアントに生存を通知）
      gameChannel.track({
        uid,
        color: myColor,
        online_at: now,
      });

      // DBにlast_seenを書き込む
      const { data, error } = await supabase
        .schema("game")
        .rpc("update_last_seen", {
          p_match_id: matchId,
          p_color: myColor,
        });
      if (data) console.error("ハートビート成功:", data);
      if (error) console.error("ハートビート失敗:", error);
    };

    // 初回即時送信
    sendHeartbeat();

    heartbeatTimerRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS,
    );
  }, []);

  // ─── 着手 ─────────────────────────────────────────────
  const handlePutStone = useCallback(
    async (grid: Grid) => {
      if (!isMyTurn || isGameEnded) return;
      if (
        !isLegalMove(
          9,
          grid,
          boardRef.current,
          lastMove,
          myColor,
          boardHistoryRef.current[boardHistoryRef.current.length - 2] ??
            initializeBoard(9),
        )
      )
        return;

      playStoneSound();
      const { board: newBoard, agehama } = applyMove(
        9,
        grid,
        cloneBoard(boardRef.current),
        myColor,
      );
      setBoard(newBoard);
      boardRef.current = newBoard;
      boardHistoryRef.current = [...boardHistoryRef.current, newBoard];

      const lastAgehama =
        agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
      agehamaHistoryRef.current.push(
        myColor === "black"
          ? { ...lastAgehama, black: lastAgehama.black + agehama }
          : { ...lastAgehama, white: lastAgehama.white + agehama },
      );
      setAgehamaHistory([...agehamaHistoryRef.current]);
      setLastMove(grid);
      movesRef.current = [...movesRef.current, stringifyGrid(grid)];
      currentIndexRef.current++;
      setIsMyTurn(false);
      turnRef.current = oppColor;

      const moveInt = gridToInt(grid);
      const { error } = await supabase.schema("game").rpc("add_move", {
        p_match_id: matchId,
        p_move: moveInt,
        p_color: myColor,
      });

      if (error) {
        console.error("着手送信失敗:", error);
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
        turnRef.current = myColor;
      }
    },
    [isMyTurn, isGameEnded, lastMove, myColor, oppColor, matchId],
  );

  // ─── パス ─────────────────────────────────────────────
  const handlePass = useCallback(async () => {
    if (!isMyTurn || isGameEnded) return;

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
    turnRef.current = oppColor;

    const { error } = await supabase.schema("game").rpc("add_move", {
      p_match_id: matchId,
      p_move: -1,
      p_color: myColor,
    });

    if (error) {
      console.error("パス送信失敗:", error);
      movesRef.current = movesRef.current.slice(0, -1);
      currentIndexRef.current--;
      boardHistoryRef.current = boardHistoryRef.current.slice(0, -1);
      agehamaHistoryRef.current = agehamaHistoryRef.current.slice(0, -1);
      setAgehamaHistory([...agehamaHistoryRef.current]);
      setIsMyTurn(true);
      turnRef.current = myColor;
    }
  }, [isMyTurn, isGameEnded, myColor, oppColor, matchId]);

  // ─── 投了 ─────────────────────────────────────────────
  const handleResign = useCallback(async () => {
    if (!isMyTurn || isGameEnded) return;

    setIsMyTurn(false);

    const { error } = await supabase.schema("game").rpc("resign", {
      p_match_id: matchId,
      p_color: myColor,
    });

    if (error) {
      console.error("投了送信失敗:", error);
      setIsMyTurn(true);
    }
  }, [isMyTurn, isGameEnded, myColor, matchId]);

  // ─── 結果OKボタン ──────────────────────────────────────
  const onPressOK = useCallback(() => {
    setShowResult(false);
    const finalIndex = boardHistoryRef.current.length - 1;
    currentIndexRef.current = finalIndex;
    setBoard(boardHistoryRef.current[finalIndex]);
    boardRef.current = boardHistoryRef.current[finalIndex];
  }, []);

  // ─── UI ──────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* 相手情報 */}
        <View style={styles.playerCell}>
          <View style={styles.passSlot}>
            <Pass
              visible={oppColor === "black" ? isBlackPass : isWhitePass}
              isLeft={true}
            />
          </View>
          <View style={styles.playerMain}>
            <Avatar
              gumiIndex={oppGumiIndex}
              iconIndex={oppIconIndex}
              size={40}
              color={oppColor}
            />
            <View style={styles.playerInfo}>
              <Text
                style={[styles.playerName]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {oppDisplayname}
              </Text>
              <View style={{ flexDirection: "row" }}>
                <AgehamaDisplay
                  count={
                    oppColor === "black"
                      ? agehamaHistory[currentIndexRef.current].black
                      : agehamaHistory[currentIndexRef.current].white
                  }
                />
                <Text style={styles.timeText}>
                  {secondsToMinutes(oppSeconds)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 碁盤 */}
        <GoBoard
          matchType={matchType}
          agehamaHistory={agehamaHistory}
          board={board}
          onPutStone={handlePutStone}
          moveHistory={movesRef.current}
          territoryBoard={territoryBoardRef.current}
          disabled={!isMyTurn || isGameEnded}
          isGameEnded={isGameEnded}
          boardHistory={boardHistoryRef.current}
          currentIndex={currentIndexRef.current}
          boardWidth={boardWidth}
        />

        {/* 自分情報 */}
        <View style={[styles.playerCell, styles.playerCellRight]}>
          <View style={[styles.passSlot, styles.passSlotRight]}>
            <Pass
              visible={myColor === "black" ? isBlackPass : isWhitePass}
              isLeft={true}
            />
          </View>
          <View style={[styles.playerMain, styles.playerMainRight]}>
            <Avatar
              gumiIndex={gumiIndex ?? 0}
              iconIndex={iconIndex ?? 0}
              size={40}
              color={myColor}
            />
            <View style={[styles.playerInfo, styles.playerInfoRight]}>
              <Text
                style={[styles.playerName, styles.playerNameRight]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayname}
              </Text>
              <View style={{ flexDirection: "row" }}>
                <AgehamaDisplay
                  count={
                    myColor === "black"
                      ? agehamaHistory[currentIndexRef.current].black
                      : agehamaHistory[currentIndexRef.current].white
                  }
                />
                <Text style={styles.timeText}>
                  {secondsToMinutes(mySeconds)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!isGameEnded ? (
          <View style={styles.actionsContainer}>
            {/* パスボタン */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                !isMyTurn && styles.actionButtonDisabled,
              ]}
              onPress={handlePass}
              disabled={!isMyTurn}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  !isMyTurn && styles.actionButtonTextDisabled,
                ]}
              >
                {t("common.pass")}
              </Text>
            </TouchableOpacity>

            {/* 投了ボタン */}
            <TouchableOpacity
              style={[
                styles.resignButton,
                !isMyTurn && styles.resignButtonDisabled,
              ]}
              onPress={handleResign}
              disabled={!isMyTurn}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resignButtonText,
                  !isMyTurn && styles.resignButtonTextDisabled,
                ]}
              >
                {t("common.resign")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.replace("/(tabs)/Home")}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>{t("common.back")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resignButton}
              onPress={() => setShowResult(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.resignButtonText}>{t("common.result")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 結果モーダル */}
      <ResultModal
        visible={showResult}
        resultComment={resultComment}
        onPressOK={onPressOK}
        pointsBefore={pointsBefore}
        pointsAfter={pointsAfter}
        gumiIndexBefore={gumiIndexBefore}
        gumiIndexAfter={gumiIndexAfter}
        setLoading={setLoading}
        setIsDailyLimitReached={setIsDailyLimitReached}
      />

      {/* ローディングオーバーレイ */}
      <LoadingModal text={t("common.loading")} visible={loading} />

      {/* 対局制限モーダル */}
      <DailyLimitModal
        visible={isDailyLimitReached}
        onClose={() => setIsDailyLimitReached(false)}
        colors={colors}
        dailyLimit={10}
      />
    </SafeAreaView>
  );
}
// ─── スタイル ───────────────────────────────────────────
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
    alignItems: "center",
    width: "100%",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
  },
  timeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2d3748",
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
  },
  resignButtonTextDisabled: {
    color: "#cbd5e0",
  },
  playersRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },

  playerCell: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  playerCellRight: {
    alignItems: "flex-end",
  },

  passSlot: {
    height: 20, // 🔥🔥🔥
    marginBottom: -10, // 🔥🔥🔥
    justifyContent: "flex-end",
    alignSelf: "stretch",
    zIndex: 1,
  },
  passSlotRight: {
    alignItems: "flex-end",
  },

  hidden: {
    opacity: 0,
  },

  playerMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playerMainRight: {
    flexDirection: "row-reverse",
  },

  playerInfoRight: {
    alignItems: "flex-end",
  },

  playerNameRight: {
    textAlign: "right",
  },
});
