import { GoBoardWithReplay } from "@/src/components/GoBoardWithReplay";
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
import LoadingOverlay from "../src/components/LoadingOverlay";
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
} from "../src/components/UserContexts";
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
} from "../src/lib/goLogics";
import {
  Agehama,
  gnuGridstoStringGrids,
  makeTerritoryBoard,
  movesToSgf,
  resultToLanguagesComment,
  sleep,
} from "../src/lib/goUtils";
import { supabase } from "../src/lib/supabase";

const BOARD_PIXEL_SIZE = 300;
const CELL_SIZE = BOARD_PIXEL_SIZE / (BOARD_SIZE_COUNT - 1);
const STONE_PIXEL_SIZE = 36;

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
  const opponentsDisplayName = Array.isArray(params.opponentsDisplayName)
    ? params.opponentsDisplayName[0]
    : params.opponentsDisplayName; // tsが配列かもってびびっちゃうらしい。params
  let [opponentsPoints, setOpponentsPoints] = useState<number>(
    Number(params.opponentsPoints),
  );
  const opponentsGames: number = Number(params.opponentsGames);

  // global state
  const uid = useContext(UidContext);

  const jwt = useContext(JwtContext);
  const myIconIndex = useContext(IconIndexContext);
  const myDisplayName = useContext(DisplayNameContext);
  const pointsGlobal = useContext(PointsContext);
  const setPoints = useContext(SetPointsContext);
  const dailyPlayCount = useContext<number | null>(DailyPlayCountContext);
  const setDailyPlayCount = useContext(SetDailyPlayCountContext);
  const gumiIndex = useContext(GumiIndexContext);
  const setGumiIndex = useContext(SetGumiIndexContext);
  // const setAcquiredIconIndices = useContext(SetAcquiredIconIndicesContext);

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
  const subscriptionRef = useRef<any>(null); // サブスクを入れとく。
  const [loading, setLoading] = useState(false); // 地計算待ち。
  const pointsBeforeRef = useRef<number | null>(null);
  const pointsAfterRef = useRef<number | null>(null);
  const gumiIndexBeforeRef = useRef<number | null>(null);
  const gumiIndexAfterRef = useRef<number | null>(null);
  if (!matchId) {
    console.warn("matchId がありません");
    router.replace("/Home");
    return null;
  }

  const updateMyPoints = (result: string) => {
    // pointsBeforeRef
    // pointsAfterRef
    // gumiIndexBeforeRef
    // gumiIndexAfterRef
    // この4つを正確に用意する責任がある。
    // Context ガード
    if (
      pointsGlobal === null ||
      setPoints === null ||
      setGumiIndex === null ||
      gumiIndex === null
      // ||
      // setAcquiredIconIndices === null
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

    // レート差を計算（自分 - 相手）
    const diff = pointsGlobal - opponentsPoints;

    // 勝った場合と負けた場合で異なるdeltaを計算
    let delta: number;
    if (isWin) {
      // 勝った場合：相手が強いほど多く獲得（diffが負ならdeltaが大きくなる）
      delta = Math.max(0, Math.min(10, 5 - Math.trunc(diff / 50)));
    } else {
      // 負けた場合：相手が弱いほど多く失う（diffが正ならdeltaが大きくなる）
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
      // 昇格。昇格した場合は、iconも増やしとく
      gumiIndexAfterRef.current = tempGumiIndex;
      setGumiIndex(tempGumiIndex);
      // setAcquiredIconIndices(
      //   Array.from({ length: tempGumiIndex + 1 }, (_, i) => i),
      // );
    } else {
      gumiIndexAfterRef.current = gumiIndex;
      setGumiIndex(gumiIndex);
    }
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

  // Supabaseのmatchesテーブルを更新
  const updateDailyPlayCount = async () => {
    let plusOne = (dailyPlayCount ?? 0) + 1;
    if (matchId) {
      const { data, error } = await supabase
        .from("profiles")
        .update({ daily_play_count: plusOne })
        .eq("id", uid)
        .select();
      if (error) {
        console.log("updateSupabaseMatchesTable/エラー", error);
      } else {
        if (setDailyPlayCount) setDailyPlayCount(plusOne);
      }
    }
  };

  // 対局終了処理
  const endGame = () => {
    console.log(movesRef.current);
    setIsGameEnded(true);
    // タイマーを停止
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Realtime subscriptionを解除
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
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
      endGame();
      updateMyPoints(result);
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

        if (
          Date.now() - opponentLastSeenRef.current > 20000 &&
          Date.now() - meLastSeenRef.current < 10000
        ) {
          const result = playerColor === "black" ? "B+C" : "W+C";
          updateSupabaseMatchesTable({
            // 接続切れ勝ちを送る。
            result,
            status: "ended",
          });
          setIsGameEnded(true);
        }

        if (Date.now() - meLastSeenRef.current > 10000) {
          const now = new Date();
          updateSupabaseMatchesTable({
            // ハートビートを送った
            [`${playerColor}_last_seen`]: now,
            [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
            moves: moveStringsToNumbers(movesRef.current), //念の為10秒に一回は送る
          });

          // meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ  // NG
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

  const soundFile = require("../assets/sounds/stone.mp3");

  // 石の音用のプレイヤーを作る
  const stonePlayer = useAudioPlayer(soundFile);

  const playStoneSound = () => {
    stonePlayer.seekTo(0); // 最初に戻す
    stonePlayer.play(); // 鳴らす
  };

  // Realtime監視
  useEffect(() => {
    // 一番最初のみ
    setIsMyTurn(playerColor === "black" ? true : false);

    // サブスク登録
    subscriptionRef.current = supabase
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
          const opponentColor = getOppositeColor(playerColor);
          const me_last_seen = `${playerColor}_last_seen`;
          const opponent_last_seen = `${opponentColor}_last_seen`;
          const stringMoves = moveNumbersToStrings(payload.new.moves);
          const stringDeadStones = moveNumbersToStrings(
            payload.new.dead_stones,
          );

          // 0. 自分からのハートビートを受け取った。あくまで自分がちゃんと接続できていることを確かにするためにも、
          // meLastSeenはあくまでこのpayLoadを受け取って初めて更新できるようにする。つまり、ローカルではなく。
          if (
            // (stringMoves?.length ?? 0) === (movesRef.current?.length ?? 0) && // 新しい手ではない
            new Date(payload.new[me_last_seen]).getTime() !==
              meLastSeenRef.current && // 自分の最後のハートビートは変わった
            new Date(payload.new[opponent_last_seen]).getTime() ===
              opponentLastSeenRef.current // 相手の最後のハートビートは変わってない
          ) {
            // meLastSeenRef.current = new Date(
            //   payload.new[me_last_seen],
            // ).getTime();
            // 自分の残り時間もついでに同期
            // myRemainSecondsRef.current =
            //   payload.new[`${playerColor}_remain_seconds`];

            console.log(
              "payload: 自分からハートビート / 手が届いた: meLastSeenRef.current: ",
              meLastSeenRef.current,
            );
          }

          // // 1. payload: 相手からのハートビートを受け取った。
          else if (
            // (stringMoves?.length ?? 0) === (movesRef.current?.length ?? 0) && // 新しい手ではない
            new Date(payload.new[me_last_seen]).getTime() ===
              meLastSeenRef.current && // 自分の最後のハートビートは変わってない
            new Date(payload.new[opponent_last_seen]).getTime() !==
              opponentLastSeenRef.current // 相手の最後のハートビートは変わった
          ) {
            // opponentLastSeenRef.current = new Date(
            //   payload.new[opponent_last_seen],
            // ).getTime();
            // 相手の残り時間もついでに同期
            // opponentsRemainSecondsRef.current =
            //   payload.new[`${getOppositeColor(playerColor)}_remain_seconds`];

            console.log(
              "payload: 相手からハートビート/ 手が届いた: opponentLastSeenRef.current: ",
              opponentLastSeenRef.current,
            );
          }

          // どんなpayloadだろうとお互いの接続状況は必ず更新

          console.log("きたpayload");
          opponentLastSeenRef.current = new Date(
            payload.new[opponent_last_seen],
          ).getTime();
          console.log(
            "opponentLastSeenRef.current: ",
            opponentLastSeenRef.current,
          );

          meLastSeenRef.current = new Date(payload.new[me_last_seen]).getTime();

          console.log("meLastSeenRef.current: ", meLastSeenRef.current);

          // 2. payload: 相手からの結果(Resign, Time, 計算結果)を受け取った。
          // 投了する時のターン：負けた側が宣言する。負けた側のまま
          // 時間切れ負けのターン：　負けた側が宣言する。負けた側のまま
          // 地計算：相手のまま
          // 要は、受け取った側であるということ。相手はすでにリザルト画面が出ているべき。なので、削除しても良いのだ。
          if (
            (payload.new.result &&
              payload.new.result[2] !== "C" &&
              payload.new.turn === getOppositeColor(playerColor)) ||
            // 自分からConnectionを受け取った
            (payload.new.result && payload.new.result[2] === "C")
          ) {
            console.log(
              "payload: 相手からR/T/地計算、もしくは自分から(相手かもしれないがだとしたら接続切れはおかしい)Cが届いた: ",
              payload.new.result,
            );

            // 終局時だけ値が入るがそれまではずっとnullなのでfalseになってくれる
            setLoading(false);
            const result: string = payload.new.result;
            if (result[2] === "R" || result[2] === "T" || result[2] === "C") {
              setResultComment(
                resultToLanguagesComment(result, playerColor) || "対局終了",
              );
            } else {
              // 地計算結果。

              console.log("stringDeadStones: ", stringDeadStones);
              const territoryBoard = makeTerritoryBoard(
                boardRef.current,
                stringDeadStones,
              ).territoryBoard;
              teritoryBoardRef.current = territoryBoard;
              setResultComment(
                resultToLanguagesComment(result, playerColor) || "対局終了",
              );
            }
            setShowResult(true);
            endGame();

            // await を安全に使うために async 関数を定義して呼ぶ
            (async () => {
              await sleep(1000); // 1秒待つ(statusがendになるのを待ってからarchiveに移動させる)
              try {
                const { data, error } = await supabase.rpc(
                  "move_match_to_archive",
                  {
                    match_id: matchId,
                  },
                );
                if (error) {
                  console.error("アーカイブ移動に失敗しました:", error);
                } else {
                  console.log("アーカイブ移動成功:", data);
                }
              } catch (err) {
                console.error("予期せぬエラー:", err);
              }
            })();

            updateMyPoints(result);
          }

          // 3. payload: 相手からの手もしくはパスを受け取った。パス速報はパスだけ送り、turnはひっくり返さないのでこちらにはこない
          else if (
            stringMoves[stringMoves.length - 1] !==
              movesRef.current[movesRef.current.length - 1] && // 送られてきたmovesの最新の手と自分の方にあるmovesの最新の手がちゃんと違っている
            payload.new.turn === playerColor && // ちゃんと相手がturnをひっくり返している
            (stringMoves?.length ?? 0) === (movesRef.current?.length ?? 0) + 1 // ちゃんと相手からの新しい手
          ) {
            console.log(
              "payload: 相手からの手が届いた: ", // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
              stringMoves[stringMoves.length - 1],
            );

            let move: string = stringMoves[stringMoves.length - 1];

            // turnSwitchedAtRef.current = Date.parse(payload.new.turn_switched_at);
            opponentLastSeenRef.current = new Date(
              payload.new[opponent_last_seen],
            ).getTime(); // 相手が着手の時も、lastseenは更新する
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
              // パス
              movesRef.current = [...movesRef.current, "p"]; // 相手からパスを受け取ったので更新
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
            } else {
              // 着手
              const { board: newBoard, agehama: agehama } = applyMove(
                keyToGrid(move),
                cloneBoard(boardRef.current),
                getOppositeColor(playerColor),
              );

              setBoard(newBoard);

              //
              movesRef.current = [
                ...movesRef.current,
                stringifyGrid(keyToGrid(move)), // 相手からの手を受け取ったので更新
              ];
              currentIndexRef.current++;
              setLastMove(keyToGrid(move));
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
            }
            // 共通の処理: 手番交代
            setIsMyTurn(true);
            turn.current = playerColor;
          }
          // 4. payload: 相手からのパス速報を受け取った。
          else if (
            stringMoves[stringMoves.length - 1] === "p" && // 送られてきたmovesの最新の手がパス
            movesRef.current[movesRef.current.length - 1] === "p" && // 自分の方にあるmovesの最新の手がパス
            payload.new.turn === getOppositeColor(playerColor) && // パス速報はturnをひっくり返さない
            (stringMoves?.length ?? 0) === (movesRef.current?.length ?? 0) + 1 // ちゃんと相手からの新しい手
          ) {
            console.log("payload: ２回連続目のパスを相手から受け取ったよ");
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

            setLoading(true);
          }
        },
      )
      .subscribe((status) => {
        // ★ ここで購読のステータスがわかる
        console.log("購読ステータス:", status);

        if (status === "SUBSCRIBED") {
          console.log("購読完了！");
          // ここで何か処理を実行できる
          // 一番最初のみ
          const now = new Date();
          //

          updateSupabaseMatchesTable({
            // ハートビートを送った
            [`${playerColor}_last_seen`]: now,
            [`${playerColor}_remain_seconds`]: myRemainSecondsRef.current,
          });
          // meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ // NG
          console.log(
            "ハートビートを送ったよ: meLastSeenRef.current: ",
            meLastSeenRef.current,
          );
        }
      });

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
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
      // meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ // NG
    } else {
      // 自分が２回目のパスをした
      setIsGameEnded(true);
      setLoading(true);
      endGame();

      updateSupabaseMatchesTable({
        // 地計算で待たせるのでとりあえずパスだけ先に伝えておく
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

        updateSupabaseMatchesTable({
          // 地計算結果を送る
          result: result,
          status: "ended",
          dead_stones: moveStringsToNumbers(stringDeadStones),
        });
        setLoading(false);

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
      // 投了した
      result,
      status: "ended",
    });

    setResultComment(
      resultToLanguagesComment(result, playerColor) || "対局終了",
    );
    setShowResult(true);
    endGame();
    updateMyPoints(result);
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
    // meLastSeenRef.current = +now; // 数字化。つまり、Date.now()と同じ // NG
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
  };

  const onPressOK = () => {
    endGame();
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
          gumiIndex={opponentsGumiIndex}
          iconIndex={opponentsIconIndex}
          name={opponentsDisplayName || ""}
          points={opponentsPoints || 0}
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
          name={myDisplayName || ""}
          points={pointsGlobal || 0}
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
