// import { useAudioPlayer } from "expo-audio";
// import { useRef, useState } from "react";
// import {
//   BOARD_SIZE_COUNT,
//   Board,
//   Color,
//   Grid,
//   applyMove,
//   cloneBoard,
//   initializeBoard,
//   stringifyGrid,
// } from "../../src/lib/goLogics";
// import {
//   Agehama,
//   gnuGridstoStringGrids,
//   makeTerritoryBoard,
//   movesToSgf,
//   sleep,
// } from "../../src/lib/goUtils";
// import { supabase } from "../../src/services/supabase";

// // ── 定数（両ページ共通） ───────────────────────────
// export const HEARTBEAT_INTERVAL_MS = 10_000;
// export const OPPONENT_TIMEOUT_MS = 20_000;
// export const SUBSCRIPTION_RETRY_LIMIT = 5;
// export const SUBSCRIPTION_RETRY_DELAY_MS = 3_000;
// export const GNU_API_TIMEOUT_MS = 30_000;

// // ── 型 ────────────────────────────────────────────
// export interface PointsUpdateConfig {
//   myPoints: number;
//   opponentsPoints: number;
//   opponentsGames?: number; // 人対人のみ（ゲーム数が100未満なら負け時にポイントを引かない）
//   allowLossDeductionAlways?: boolean; // ボットは格上負けは減らさない
// }

// // ── GNUGo API 共通fetch ───────────────────────────
// export const fetchGnuGoApi = async (
//   endpoint: "play" | "score",
//   sgf: string,
//   jwt: string | null,
// ): Promise<any | null> => {
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), GNU_API_TIMEOUT_MS);
//   try {
//     const response = await fetch(`https://gnugo-api.fly.dev/${endpoint}`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${jwt}`,
//       },
//       body: JSON.stringify({ sgf }),
//       signal: controller.signal,
//     });
//     clearTimeout(timeoutId);
//     if (!response.ok) {
//       const body = await response.json().catch(() => ({}));
//       console.error(`GNUGo API (${endpoint}) エラー:`, body);
//       return null;
//     }
//     return await response.json();
//   } catch (err: any) {
//     clearTimeout(timeoutId);
//     if (err.name === "AbortError") {
//       console.error(`GNUGo API (${endpoint}): タイムアウト`);
//     } else {
//       console.error(`GNUGo API (${endpoint}): 予期せぬエラー`, err);
//     }
//     return null;
//   }
// };

// // ── Supabase matches 更新（リトライ付き） ─────────────
// export const updateMatchesTable = async (
//   matchId: string,
//   updateData: object,
//   retries = 3,
// ): Promise<boolean> => {
//   for (let attempt = 0; attempt < retries; attempt++) {
//     const { error } = await supabase
//       .from("matches")
//       .update(updateData)
//       .eq("id", matchId)
//       .select();
//     if (!error) return true;
//     console.warn(
//       `updateMatchesTable: 試行 ${attempt + 1}/${retries} 失敗`,
//       error,
//     );
//     if (attempt < retries - 1) await sleep(1000 * (attempt + 1));
//   }
//   console.error("updateMatchesTable: 全リトライ失敗");
//   return false;
// };

// // ── アーカイブ移動 ────────────────────────────────
// export const moveMatchToArchive = async (matchId: string) => {
//   await sleep(1000);
//   try {
//     const { error } = await supabase.rpc("move_match_to_archive", {
//       match_id: matchId,
//     });
//     if (error) console.error("アーカイブ移動失敗:", error);
//     else console.log("アーカイブ移動成功");
//   } catch (err) {
//     console.error("アーカイブ移動: 予期せぬエラー:", err);
//   }
// };

// // ── ポイント差分計算（純粋関数） ──────────────────────
// export const calcPointsDelta = (
//   isWin: boolean,
//   myPoints: number,
//   opponentsPoints: number,
// ): number => {
//   const diff = myPoints - opponentsPoints;
//   if (isWin) {
//     return Math.max(0, Math.min(10, 5 - Math.trunc(diff / 50)));
//   } else {
//     return Math.max(0, Math.min(10, 5 + Math.trunc(diff / 50)));
//   }
// };

// // ── 地計算（フォールバック付き）純粋関数 ─────────────
// export const calcTerritoryResult = async (
//   board: Board,
//   movesRef: React.MutableRefObject<string[]>,
//   jwt: string | null,
// ): Promise<{ result: string; stringDeadStones: string[] }> => {
//   const sgf = movesToSgf(movesRef.current);
//   console.log("地計算 SGF:", sgf);

//   const gnuDeadStones = await fetchGnuGoApi("score", sgf, jwt);

//   let stringDeadStones: string[];
//   if (gnuDeadStones === null) {
//     console.warn("GNUGo score API失敗: 死に石なしでフォールバック");
//     stringDeadStones = [];
//   } else {
//     stringDeadStones = gnuGridstoStringGrids(gnuDeadStones);
//     console.log("死に石:", stringDeadStones);
//   }

//   const { result } = makeTerritoryBoard(board, stringDeadStones);
//   return { result, stringDeadStones };
// };

// // ── useGameBoard カスタムフック ───────────────────────
// // 両ページ共通の盤面・タイマー・操作ガード・ポイント関連のstate/refを管理する。
// // サブスク（人対人）やボット手番処理（ボット）など、モード固有の処理は各ページで実装する。
// export interface UseGameBoardReturn {
//   // 盤面
//   board: Board;
//   setBoard: React.Dispatch<React.SetStateAction<Board>>;
//   boardRef: React.RefObject<Board>;
//   boardHistoryRef: React.RefObject<Board[]>;
//   teritoryBoardRef: React.RefObject<number[][]>;
//   agehamaHistory: Agehama[];
//   setAgehamaHistory: React.Dispatch<React.SetStateAction<Agehama[]>>;
//   agehamaHistoryRef: React.RefObject<Agehama[]>;
//   // 手
//   lastMove: Grid | null;
//   setLastMove: React.Dispatch<React.SetStateAction<Grid | null>>;
//   movesRef: React.RefObject<string[]>;
//   currentIndexRef: React.RefObject<number>;
//   // ターン・ゲーム状態
//   isMyTurn: boolean | null;
//   setIsMyTurn: React.Dispatch<React.SetStateAction<boolean | null>>;
//   turn: React.RefObject<"black" | "white">;
//   isGameEnded: boolean;
//   setIsGameEnded: React.Dispatch<React.SetStateAction<boolean>>;
//   isGameEndedRef: React.RefObject<boolean>;
//   // タイマー
//   timerRef: React.RefObject<ReturnType<typeof setInterval> | null>;
//   myRemainSecondsRef: React.RefObject<number>;
//   opponentsRemainSecondsRef: React.RefObject<number>;
//   myRemainSecondsDisplay: number;
//   setMyRemainingSecondsDisplay: React.Dispatch<React.SetStateAction<number>>;
//   opponentsRemainSecondsDisplay: number;
//   setOpponentsRemainingSecondsDisplay: React.Dispatch<
//     React.SetStateAction<number>
//   >;
//   meLastSeenRef: React.RefObject<number>;
//   opponentLastSeenRef: React.RefObject<number>;
//   // 結果表示
//   resultComment: string | null;
//   setResultComment: React.Dispatch<React.SetStateAction<string | null>>;
//   showResult: boolean;
//   setShowResult: React.Dispatch<React.SetStateAction<boolean>>;
//   loading: boolean;
//   setLoading: React.Dispatch<React.SetStateAction<boolean>>;
//   // ポイント
//   pointsBeforeRef: React.RefObject<number | null>;
//   pointsAfterRef: React.RefObject<number | null>;
//   gumiIndexBeforeRef: React.RefObject<number | null>;
//   gumiIndexAfterRef: React.RefObject<number | null>;
//   // 操作ガード
//   isActionInProgressRef: React.RefObject<boolean>;
//   // 関数
//   handleCurrentIndexChange: (newIndex: number) => void;
//   appendPassToHistory: () => void;
//   appendMoveToHistory: (grid: Grid, color: Color) => void;
//   rollbackLastMove: () => void;
//   playStoneSound: () => void;
// }

// export const useGameBoard = (): UseGameBoardReturn => {
//   // ── 盤面 ────────────────────────────────────────
//   const [board, setBoard] = useState<Board>(initializeBoard());
//   const boardRef = useRef<Board>(initializeBoard());
//   const boardHistoryRef = useRef<Board[]>([initializeBoard()]);
//   const teritoryBoardRef = useRef<number[][]>(
//     Array.from({ length: BOARD_SIZE_COUNT }, () =>
//       Array.from({ length: BOARD_SIZE_COUNT }, () => 0),
//     ),
//   );
//   const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
//     { black: 0, white: 0 },
//   ]);
//   const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);

//   // ── 手 ──────────────────────────────────────────
//   const [lastMove, setLastMove] = useState<Grid | null>(null);
//   const movesRef = useRef<string[]>([]);
//   const currentIndexRef = useRef<number>(0);

//   // ── ターン・ゲーム状態 ─────────────────────────────
//   const [isMyTurn, setIsMyTurn] = useState<boolean | null>(null);
//   const turn = useRef<"black" | "white">("black");
//   const [isGameEnded, setIsGameEnded] = useState(false);
//   const isGameEndedRef = useRef(false);

//   // ── タイマー ────────────────────────────────────
//   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const myRemainSecondsRef = useRef(180);
//   const opponentsRemainSecondsRef = useRef(180);
//   const [myRemainSecondsDisplay, setMyRemainingSecondsDisplay] = useState(180);
//   const [opponentsRemainSecondsDisplay, setOpponentsRemainingSecondsDisplay] =
//     useState(180);
//   const meLastSeenRef = useRef(Date.now());
//   const opponentLastSeenRef = useRef(Date.now());

//   // ── 結果表示 ─────────────────────────────────────
//   const [resultComment, setResultComment] = useState<string | null>(null);
//   const [showResult, setShowResult] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const pointsBeforeRef = useRef<number | null>(null);
//   const pointsAfterRef = useRef<number | null>(null);
//   const gumiIndexBeforeRef = useRef<number | null>(null);
//   const gumiIndexAfterRef = useRef<number | null>(null);

//   // ── 操作ガード ──────────────────────────────────
//   const isActionInProgressRef = useRef(false);

//   // ── 音 ──────────────────────────────────────────
//   const soundFile = require("../../assets/sounds/stone.mp3");
//   const stonePlayer = useAudioPlayer(soundFile);
//   const playStoneSound = () => {
//     stonePlayer.seekTo(0);
//     stonePlayer.play();
//   };

//   // ── リプレイ: インデックス変更ハンドラ ───────────────
//   const handleCurrentIndexChange = (newIndex: number) => {
//     currentIndexRef.current = newIndex;
//     setBoard(boardHistoryRef.current[newIndex]);
//     boardRef.current = boardHistoryRef.current[newIndex];
//   };

//   // ── パスを履歴に追加（盤面はそのままコピー）──────────
//   const appendPassToHistory = () => {
//     movesRef.current = [...movesRef.current, "p"];
//     currentIndexRef.current++;
//     setLastMove({ row: 0, col: 0 });
//     boardHistoryRef.current = [
//       ...boardHistoryRef.current,
//       cloneBoard(boardRef.current),
//     ];
//     const last =
//       agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
//     agehamaHistoryRef.current.push({ ...last });
//     setAgehamaHistory([...agehamaHistoryRef.current]);
//   };

//   // ── 着手を盤面・履歴に反映 ───────────────────────────
//   const appendMoveToHistory = (grid: Grid, color: Color) => {
//     const { board: newBoard, agehama } = applyMove(
//       grid,
//       cloneBoard(boardRef.current),
//       color,
//     );
//     setBoard(newBoard);
//     boardRef.current = newBoard;
//     boardHistoryRef.current = [...boardHistoryRef.current, newBoard];
//     movesRef.current = [...movesRef.current, stringifyGrid(grid)];
//     currentIndexRef.current++;
//     setLastMove(grid);

//     const lastAgehama =
//       agehamaHistoryRef.current[agehamaHistoryRef.current.length - 1];
//     if (color === "black") {
//       agehamaHistoryRef.current.push({
//         ...lastAgehama,
//         black: lastAgehama.black + agehama,
//       });
//     } else {
//       agehamaHistoryRef.current.push({
//         ...lastAgehama,
//         white: lastAgehama.white + agehama,
//       });
//     }
//     setAgehamaHistory([...agehamaHistoryRef.current]);
//   };

//   // ── 着手失敗時のロールバック ─────────────────────────
//   const rollbackLastMove = () => {
//     movesRef.current = movesRef.current.slice(0, -1);
//     currentIndexRef.current--;
//     boardHistoryRef.current = boardHistoryRef.current.slice(0, -1);
//     agehamaHistoryRef.current = agehamaHistoryRef.current.slice(0, -1);
//     const prevBoard =
//       boardHistoryRef.current[boardHistoryRef.current.length - 1];
//     boardRef.current = prevBoard;
//     setBoard(prevBoard);
//     setAgehamaHistory([...agehamaHistoryRef.current]);
//   };

//   return {
//     board,
//     setBoard,
//     boardRef,
//     boardHistoryRef,
//     teritoryBoardRef,
//     agehamaHistory,
//     setAgehamaHistory,
//     agehamaHistoryRef,
//     lastMove,
//     setLastMove,
//     movesRef,
//     currentIndexRef,
//     isMyTurn,
//     setIsMyTurn,
//     turn,
//     isGameEnded,
//     setIsGameEnded,
//     isGameEndedRef,
//     timerRef,
//     myRemainSecondsRef,
//     opponentsRemainSecondsRef,
//     myRemainSecondsDisplay,
//     setMyRemainingSecondsDisplay,
//     opponentsRemainSecondsDisplay,
//     setOpponentsRemainingSecondsDisplay,
//     meLastSeenRef,
//     opponentLastSeenRef,
//     resultComment,
//     setResultComment,
//     showResult,
//     setShowResult,
//     loading,
//     setLoading,
//     pointsBeforeRef,
//     pointsAfterRef,
//     gumiIndexBeforeRef,
//     gumiIndexAfterRef,
//     isActionInProgressRef,
//     handleCurrentIndexChange,
//     appendPassToHistory,
//     appendMoveToHistory,
//     rollbackLastMove,
//     playStoneSound,
//   };
// };
