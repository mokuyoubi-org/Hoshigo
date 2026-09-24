// usePracticeSession.ts
//
// 実際の対局（1局分）の状態とロジックを管理するフック。
// 🌟「対局開始」が確定した後（PracticeGameScreenContentが
// マウントされた時）にだけ生成される。盤サイズ・ハンデ・プレイヤーは
// 呼び出し側から固定値として受け取り、このフック自身はKVStorageを
// 読まない。読んでしまうと、セットアップ画面でユーザーが値を変更して
// いる間も useGoGame が古い初期値を握ったまま更新されない、という
// 不具合の原因になるため。

import {
  BotProfile,
  BotUsername,
  getBotProfile,
} from "@/src/active/constants/botProfiles";
import { useBotCalculation } from "@/src/active/hooks/bot/useBotCalculation";
import { useBotMove } from "@/src/active/hooks/bot/useBotMove";
import { useLiveAnalysis } from "@/src/active/hooks/match/useLiveAnalysis";
import { useTranslation } from "@/src/active/i18n";
import { isBot } from "@/src/stable/logics/bot/botLogics";
import { getPassState } from "@/src/stable/logics/gameScreenLogics";
import {
  resultToObjectiveComment,
  resultToSubjectiveComment,
} from "@/src/stable/logics/textFormatter";
import { AnalyzeResult, ModelId } from "expo-katago";
import { useGoGame } from "go-components";
import {
  BLACK,
  BoardSize,
  Color,
  getColorToMove,
  Grid,
  MatchType,
  PASS_GRID,
  RecordAnalysis,
  WHITE,
} from "go-core";
import { useEffect, useRef, useState } from "react";
import { isReliableForTerritory } from "../../../stable/logics/territoryReliability";
import { useProfile } from "../../contexts/ProfileContexts";
import { useKataGoTask } from "../bot/useKataGoTask";

export type PlayerType = {
  username: string;
  uid: string;
  rating: number;
  iconIndex: number;
};

// 🌟 PlayerCard 1枚分の描画にそのまま渡せる、完成済みの表示情報
export type PlayerCardView = {
  username: string;
  iconIndex: number;
  rating: number;
  color: Color;
  showPass: boolean;
  agehamaCount: number;
};

type UsePracticeSessionArgs = {
  boardSize: BoardSize;
  matchType: MatchType;
  blackPlayer: PlayerType;
  whitePlayer: PlayerType;
};

// export type PracticeMatchStatus = "human_human" | "human_bot" | "bot_bot"

export function usePracticeSession({
  boardSize,
  matchType,
  blackPlayer,
  whitePlayer,
}: UsePracticeSessionArgs) {
  const { rating9, rating13, rating19, iconIndex, username } = useProfile();
  const t = useTranslation();

  const myRatingForBoardSize =
    (boardSize === 9 ? rating9 : boardSize === 13 ? rating13 : rating19) ?? 0;
  const myIconIndex = iconIndex ?? 0;

  const isBotBotMatch: boolean =
    (isBot(blackPlayer.username) && isBot(whitePlayer.username)) ?? true;

  const isHumanHumanMatch: boolean =
    (!isBot(blackPlayer.username) && !isBot(whitePlayer.username)) ?? true;

  const isHumanBotMatch: boolean =
    (!isHumanHumanMatch && !isBotBotMatch) ?? true;

  const practiceMatchStatus: string = isHumanHumanMatch
    ? "human_human"
    : isHumanBotMatch
      ? "human_bot"
      : "bot_bot";

  const myColor: Color | undefined =
    isHumanBotMatch && !isBot(blackPlayer.username)
      ? BLACK
      : isHumanBotMatch && !isBot(whitePlayer.username)
        ? WHITE
        : undefined;

  const oppColor: Color = myColor === BLACK ? WHITE : BLACK;

  // 人間 対 Bot のとき、実際に対戦しているBotのプロフィール。
  // (人間同士・Bot同士のときは記録用のダミーとして bot1 を使う)
  const opponentBotUsername: BotUsername =
    (isHumanBotMatch && isBot(blackPlayer.username)
      ? blackPlayer.username
      : isHumanBotMatch && isBot(whitePlayer.username)
        ? whitePlayer.username
        : "bot1") ?? "bot1";
  const opponentBotProfile: BotProfile = getBotProfile(
    opponentBotUsername,
    boardSize,
  );

  // ================================================
  //                   state
  // ================================================

  const kataGoTask = useKataGoTask();
  // 🌟修正: このフックがマウントされる瞬間（＝対局開始が確定した瞬間）の
  // boardSize/matchTypeで、ここで初めて盤面が作られる。
  // 以前はusePracticeSession全体が画面が開いた瞬間から存在していたため、
  // ここで握られる値がユーザーの設定変更を反映しないまま古くなっていた。
  const goBoard = useGoGame({ boardSize, matchType, movesInt: [] });
  const { boardRef, movesRef } = goBoard;

  // 黒番・白番それぞれの botMove フック（bot の場合のみ使う）
  const blackBotMove = useBotMove(
    BLACK,
    boardSize,
    blackPlayer.username !== "you" ? blackPlayer.username : "bot1",
  );
  const whiteBotMove = useBotMove(
    WHITE,
    boardSize,
    whitePlayer.username !== "you" ? whitePlayer.username : "bot1",
  );

  const endgame = useBotCalculation();
  const liveAnalysis = useLiveAnalysis();
  const [isGameEnded, setIsGameEnded] = useState(false);
  const isGameEndedRef = useRef(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const isBotRunningRef = useRef(false);
  const [resultComment, setResultComment] = useState("");
  const [resultRaw, setResultRaw] = useState<string | null>(null);
  const [finalDeadStones, setFinalDeadStones] = useState<number[]>([]);
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<RecordAnalysis>({
    perMove: [],
  });
  const [isDoublePass, setIsDoublePass] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const lastPositionAnalysisRef = useRef<{
    moveCount: number;
    analysis: AnalyzeResult | null;
    modelId?: ModelId;
  }>({ moveCount: -1, analysis: null });

  // 🌟画面離脱後も推論・タイマー・setStateが走り続けないようにするためのガード
  const isMountedRef = useRef(true);
  const botTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredInitialBotTurnRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (botTurnTimeoutRef.current) {
        clearTimeout(botTurnTimeoutRef.current);
        botTurnTimeoutRef.current = null;
      }
    };
  }, []);

  // 🌟投げっぱなしの背景分析(人間の手番ごとの先読み解析)が
  // 何件「まだ完了していないか」を数える。投了時はkataGoTaskの
  // キューを経由しない(=FIFOの恩恵を受けられない)ため、明示的に
  // これがゼロになるまで待ってから遷移する。
  const pendingBackgroundAnalysisRef = useRef(0);
  const pendingAnalysisResolversRef = useRef<(() => void)[]>([]);

  const beginBackgroundAnalysis = () => {
    pendingBackgroundAnalysisRef.current += 1;
  };

  const endBackgroundAnalysis = () => {
    pendingBackgroundAnalysisRef.current = Math.max(
      0,
      pendingBackgroundAnalysisRef.current - 1,
    );
    if (pendingBackgroundAnalysisRef.current === 0) {
      const resolvers = pendingAnalysisResolversRef.current;
      pendingAnalysisResolversRef.current = [];
      resolvers.forEach((resolve) => resolve());
    }
  };

  const waitForPendingBackgroundAnalysis = (): Promise<void> => {
    if (pendingBackgroundAnalysisRef.current === 0) return Promise.resolve();
    return new Promise((resolve) => {
      pendingAnalysisResolversRef.current.push(resolve);
    });
  };

  // ================================================
  //                   関数
  // ================================================

  const getCurrentColor = () =>
    getColorToMove(matchType, movesRef.current.length);

  const getCurrentPlayer = () => {
    const color = getCurrentColor();
    return color === BLACK ? blackPlayer : whitePlayer;
  };

  const endGame = async (
    reason?: "resign",
    precomputedAnalysis?: AnalyzeResult | null,
  ) => {
    if (isGameEndedRef.current) return;
    isGameEndedRef.current = true;
    setIsCalculating(true);

    if (reason === "resign") {
      const currentColor = getCurrentColor();
      const winnerColor = currentColor === BLACK ? WHITE : BLACK;
      const result = `${winnerColor === BLACK ? "B" : "W"}+R`;

      setResultRaw(result);
      setResultComment(
        (isHumanBotMatch
          ? resultToSubjectiveComment(result, BLACK, t)
          : resultToObjectiveComment(result, t)) ?? t("common.matchComplete"),
      );

      await waitForPendingBackgroundAnalysis();
      await setLiveAnalysisResult(liveAnalysis.getRecordAnalysis());
      setIsCalculating(false);
      setIsGameEnded(true);
      return;
    }

    const { deadStones, analysis } = await endgame.analyzeTerritory(
      boardRef.current,
      movesRef.current,
      matchType,
      boardSize,
      precomputedAnalysis,
    );
    if (!isMountedRef.current) return;
    goBoard.setDeadStones(deadStones);
    setFinalDeadStones(deadStones);
    liveAnalysis.record(movesRef.current.length, analysis);

    const territoryResult = goBoard.computeTerritory();
    goBoard.setTerritoryBoard(territoryResult.territoryBoard);
    setResultRaw(territoryResult.result);
    setResultComment(
      (isHumanBotMatch
        ? resultToSubjectiveComment(territoryResult.result, BLACK, t)
        : resultToObjectiveComment(territoryResult.result, t)) ??
        t("common.matchComplete"),
    );

    await setLiveAnalysisResult(liveAnalysis.getRecordAnalysis());
    setIsCalculating(false);
    setIsGameEnded(true);
  };

  const runBotTurnIfNeeded = async () => {
    if (!isMountedRef.current) return;
    if (isGameEndedRef.current || isBotRunningRef.current) return;

    const colorToMove = getCurrentColor();
    const activePlayer = getCurrentPlayer();

    if (activePlayer.username === "you") return;

    isBotRunningRef.current = true;
    setIsBotThinking(true);

    try {
      const botMoveIndex = movesRef.current.length;
      const botMove = colorToMove === BLACK ? blackBotMove : whiteBotMove;

      await botMove.runBotTurn(
        boardRef.current,
        movesRef.current,
        matchType,
        (grid, analysis) => {
          if (!isMountedRef.current) return;
          goBoard.applyTrustedMove(grid, colorToMove);
          liveAnalysis.record(botMoveIndex, analysis);
          lastPositionAnalysisRef.current = {
            moveCount: botMoveIndex,
            analysis,
            modelId: analysis?.modelId,
          };
        },
        true,
      );

      if (!isMountedRef.current) return;

      const moves = movesRef.current;
      const isDoublePass =
        moves.length >= 2 &&
        moves[moves.length - 1] === PASS_GRID &&
        moves[moves.length - 2] === PASS_GRID;

      if (isDoublePass) {
        setIsDoublePass(true);
        const cached = lastPositionAnalysisRef.current;
        const precomputedAnalysis =
          cached.moveCount === moves.length - 1 &&
          isReliableForTerritory(cached.modelId)
            ? cached.analysis
            : undefined;
        await endGame(undefined, precomputedAnalysis);
      } else {
        const nextPlayer = getCurrentPlayer();
        if (nextPlayer.username !== "you") {
          botTurnTimeoutRef.current = setTimeout(() => {
            botTurnTimeoutRef.current = null;
            if (isMountedRef.current) {
              runBotTurnIfNeeded();
            }
          }, 100);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsBotThinking(false);
      }
      isBotRunningRef.current = false;
    }
  };

  const handlePutStone = async (grid: Grid) => {
    if (isGameEndedRef.current || isBotThinking) return;

    const activePlayer = getCurrentPlayer();
    if (activePlayer.username !== "you") return;

    const currentColor = getCurrentColor();
    const applied = goBoard.applyLegalMove(grid, currentColor);
    if (!applied) return;

    const moves = movesRef.current;
    const isDoublePass =
      moves.length >= 2 &&
      moves[moves.length - 1] === PASS_GRID &&
      moves[moves.length - 2] === PASS_GRID;

    if (isDoublePass) {
      setIsDoublePass(true);

      const cached = lastPositionAnalysisRef.current;
      const precomputedAnalysis =
        cached.moveCount === moves.length - 1 &&
        isReliableForTerritory(cached.modelId)
          ? cached.analysis
          : undefined;
      await endGame(undefined, precomputedAnalysis);
      return;
    }

    await runBotTurnIfNeeded();
  };

  const handleResign = () => {
    if (isGameEndedRef.current || isBotThinking) return;
    endGame("resign");
  };

  // 🌟このフック自身がマウントされた時点で「対局開始」が確定している
  // (呼び出し元のPracticeGameScreenContentは「対局開始」ボタンが
  // 押された時にだけマウントされるため)。黒番がbotならマウント直後に
  // 初手を打たせる。
  useEffect(() => {
    if (hasTriggeredInitialBotTurnRef.current) return;
    hasTriggeredInitialBotTurnRef.current = true;
    runBotTurnIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🌟人間（You）の手番での背景分析処理
  useEffect(() => {
    const activePlayer =
      getColorToMove(matchType, goBoard.currentIndex) === BLACK
        ? blackPlayer
        : whitePlayer;

    if (activePlayer.username !== "you") return;

    const moves = goBoard.moves;
    const nextMoveIndex = moves.length;

    const isDoublePass =
      moves.length >= 2 &&
      moves[moves.length - 1] === PASS_GRID &&
      moves[moves.length - 2] === PASS_GRID;
    if (isDoublePass) {
      setIsDoublePass(true);

      return;
    }

    const board = goBoard.boardHistoryRef.current[nextMoveIndex];
    if (!board) return;

    const currentColor = getColorToMove(matchType, nextMoveIndex);

    beginBackgroundAnalysis();
    (async () => {
      try {
        const analysis = await kataGoTask.run({
          board,
          movesSoFar: moves,
          matchType,
          boardSize,
          modelId: "b10",
          currentPlayer: currentColor,
        });

        if (!isMountedRef.current) return;

        liveAnalysis.record(nextMoveIndex, analysis);
        lastPositionAnalysisRef.current = {
          moveCount: nextMoveIndex,
          analysis,
          modelId: analysis?.modelId,
        };
      } finally {
        endBackgroundAnalysis();
      }
    })();
  }, [goBoard.moves]);

  // ================================================
  //     PlayerCard 用の表示情報（黒/白ではなく上/下で組み立てる）
  // ================================================

  const currentAgehama = goBoard.agehamaHistory[goBoard.currentIndex] ?? {
    black: 0,
    white: 0,
  };
  const moveHistoryUpToCurrent =
    goBoard.moves?.slice(0, goBoard.currentIndex + 1) ?? [];
  const { isBlackPass, isWhitePass } = getPassState(
    goBoard.currentIndex,
    moveHistoryUpToCurrent,
    matchType,
  );

  const buildPlayerCardView = (
    color: Color,
    info: { username: string; iconIndex: number; rating: number },
  ): PlayerCardView => ({
    ...info,
    color,
    showPass: color === BLACK ? isBlackPass : isWhitePass,
    agehamaCount: color === BLACK ? currentAgehama.black : currentAgehama.white,
  });

  const topPlayerView = buildPlayerCardView(
    (isHumanBotMatch ? oppColor : WHITE) ?? WHITE,
    {
      username:
        (isHumanBotMatch
          ? opponentBotProfile.username
          : whitePlayer.username) ?? whitePlayer.username,
      iconIndex:
        (isHumanBotMatch
          ? opponentBotProfile.iconIndex
          : whitePlayer.iconIndex) ?? whitePlayer.iconIndex,
      rating:
        (isHumanBotMatch ? opponentBotProfile.rating : whitePlayer.rating) ??
        whitePlayer.rating,
    },
  );

  const bottomPlayerView = buildPlayerCardView(
    (isHumanBotMatch ? myColor : BLACK) ?? BLACK,
    {
      username:
        isHumanHumanMatch || isBotBotMatch
          ? blackPlayer.username
          : (username ?? ""),
      iconIndex: (isHumanBotMatch ? iconIndex : blackPlayer.iconIndex) ?? 0,
      rating:
        (isHumanBotMatch ? myRatingForBoardSize : blackPlayer.rating) ?? 0,
    },
  );

  // 🌟対局開始モーダル用の表示情報を組み立てるヘルパー
  const getPlayerGameStartInfo = (player: PlayerType) => {
    if (isBot(player.username)) {
      const profile = getBotProfile(player.username, boardSize);
      return {
        username: profile.username,
        iconIndex: profile.iconIndex,
        ratingOrRank: profile.rating,
      };
    }
    return {
      username: player.username,
      iconIndex: myIconIndex,
      ratingOrRank: myRatingForBoardSize,
    };
  };

  return {
    boardHistory: goBoard.boardHistory,
    agehamaHistory: goBoard.agehamaHistory,
    moves: goBoard.moves,
    movesRef,
    currentIndex: goBoard.currentIndex,
    setCurrentIndex: goBoard.setCurrentIndex,
    territoryBoard: goBoard.territoryBoard,
    isGameEnded,
    isBotThinking,
    handlePutStone,
    handleResign,
    topPlayerView,
    bottomPlayerView,
    resultRaw,
    resultComment,
    finalDeadStones,
    liveAnalysisResult,
    practiceMatchStatus,
    myColor,
    opponentBotProfile,
    getPlayerGameStartInfo,
    username,
    iconIndex,
    myRatingForBoardSize,
    isDoublePass,
    isCalculating,
  };
}
