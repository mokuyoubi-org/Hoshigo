// expo/src/hooks/practice/usePracticeSession.ts
//
// 実際の対局（1局分）の状態とロジックを管理するフック。
// 🌟「対局開始」が確定した後（PracticeGameScreenContentが
// マウントされた時）にだけ生成される。盤サイズ・ハンデ・プレイヤーは
// 呼び出し側から固定値として受け取り、このフック自身はKVStorageを
// 読まない。

import {
  BotProfile,
  BotUsername,
  getBotProfile,
} from "@/src/constants/botProfiles";
import { useProfile } from "@/src/contexts/ProfileContexts";
import { useBotMove } from "@/src/hooks/ai/useBotMove";
import { useLiveAnalysis } from "@/src/hooks/ai/useLiveAnalysis";
import { useTranslation } from "@/src/i18n/LangProvider";
import { isBot } from "@/src/logics/format/nameFormatter";
import {
  resultToObjectiveComment,
  resultToSubjectiveComment,
  scoreLeadToResult,
} from "@/src/logics/format/textFormatter";
import { getPassState } from "@/src/logics/game/gameScreenLogics";
import { getMyRating } from "@/src/logics/rank/myRating";
import { PlayerCardView, PlayerType } from "@/src/types/player";
import { ShowMode, useGoGame } from "go-components";
import {
  BLACK,
  BoardSize,
  Color,
  endsWithDoublePass,
  getColorToMove,
  Grid,
  hasKoPoint,
  MatchType,
  PASS_GRID,
  RecordAnalysis,
  WHITE,
} from "go-core";
import { useKVStorage } from "kv-store";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

type UsePracticeSessionArgs = {
  boardSize: BoardSize;
  matchType: MatchType;
  blackPlayer: PlayerType;
  whitePlayer: PlayerType;
  // 🌟 途中から始める時の、これまでの手。新規対局なら空配列
  initialMoves: Grid[];
  // 🌟 途中から始める時の、これまでの分析結果。なければ undefined
  initialAnalysis: RecordAnalysis | undefined;
};

// 🌟 bot vs bot: 連続パスで終局したあと、棋譜画面へ移る前に、
// 観戦している人がパスを見られるように待つ時間(ミリ秒)。
const BOTBOT_FINAL_PASS_VIEW_MS = 1000;

// 🌟 botの着手分析に失敗した時のやり直し。
// 待ち時間は1回目1秒、2回目2秒…と増やす。最大回数を超えたら、結果なしで対局を終える。
const BOT_RETRY_MAX = 3;
const BOT_RETRY_WAIT_MS = 1000;

export const usePracticeSession = ({
  boardSize,
  matchType,
  blackPlayer,
  whitePlayer,
  initialMoves,
  initialAnalysis,
}: UsePracticeSessionArgs) => {
  // 画面の表示設定(PracticeScreenSettingsModal と同じキーを見ている)
  const { value: showOwnership } = useKVStorage<boolean>(
    "PracticeScreen.showOwnership",
    true,
  );

  const { value: showWinRateBar } = useKVStorage<boolean>(
    "PracticeScreen.showWinRateBar",
    true,
  );

  const { value: showMode } = useKVStorage<ShowMode>(
    "PracticeScreen.showMode",
    "both",
  );

  const { value: isSoundEnabled } = useKVStorage<boolean>("global.sound", true);

  const { value: doubleTap } = useKVStorage<boolean>(
    `global.doubleTap${boardSize}`,
    false,
  );

  const { rating9, rating13, rating19, iconIndex } = useProfile();
  const t = useTranslation();

  const myRatingForBoardSize = getMyRating(
    { rating9, rating13, rating19 },
    boardSize,
  );
  const myIconIndex = iconIndex ?? 0;

  const isBotBotMatch: boolean =
    isBot(blackPlayer.username) && isBot(whitePlayer.username);

  const isHumanHumanMatch: boolean =
    !isBot(blackPlayer.username) && !isBot(whitePlayer.username);

  const isHumanBotMatch: boolean = !isHumanHumanMatch && !isBotBotMatch;

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
  const opponentBotUsername: BotUsername = (
    isHumanBotMatch && isBot(blackPlayer.username)
      ? blackPlayer.username
      : isHumanBotMatch && isBot(whitePlayer.username)
        ? whitePlayer.username
        : "bot1"
  ) as BotUsername;

  const opponentBotProfile: BotProfile = getBotProfile(
    opponentBotUsername,
    boardSize,
  );

  // ================================================
  //                   state
  // ================================================
  // 🌟修正: このフックがマウントされる瞬間（＝対局開始が確定した瞬間）の
  // boardSize/matchTypeで、ここで初めて盤面が作られる。
  // 以前はusePracticeSession全体が画面が開いた瞬間から存在していたため、
  // ここで握られる値がユーザーの設定変更を反映しないまま古くなっていた。
  // 🌟 最初に受け取った手だけを握っておく。
  // (親の再描画のたびに新しい配列が来ても、盤が作り直されないようにする)
  // useStateの初期値は最初の1回しか使われないので、refの代わりになる。
  const [firstMoves] = useState(initialMoves);
  const goBoard = useGoGame({
    boardSize,
    matchType,
    movesInt: firstMoves,
  });
  const { boardRef, movesRef } = goBoard;

  // 🌟手の並びが連続パスで終わっているか。stateで持たず、手の並びから毎回計算する。
  const isDoublePass = endsWithDoublePass(goBoard.moves);

  // 黒番・白番それぞれの botMove フック（bot の場合のみ使う）
  const blackBotMove = useBotMove(
    BLACK,
    boardSize,
    blackPlayer.username as BotUsername,
  );
  const whiteBotMove = useBotMove(
    WHITE,
    boardSize,
    whitePlayer.username as BotUsername,
  );

  const liveAnalysis = useLiveAnalysis({
    matchType,
    boardSize,
    initialAnalysis,
    // 🌟 分析が1局面記録されるたびに、画面用のstateへ流し込む。
    //   syncLiveAnalysis は少し下で定義しているが、呼ばれるのは描画のあとなので順番は問題ない。
    onRecorded: () => syncLiveAnalysis(),
  });
  const [isGameEnded, setIsGameEnded] = useState(false);
  const isGameEndedRef = useRef(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const isBotRunningRef = useRef(false);
  const [resultComment, setResultComment] = useState("");
  const [resultRaw, setResultRaw] = useState<string | null>(null);
  // 🌟 最初は、引き継いだ分析結果で始まる(なければ空)
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<RecordAnalysis>(
    () => liveAnalysis.getRecordAnalysis(),
  );
  const [isCalculating, setIsCalculating] = useState(false);
  // 🌟 bot vs bot 用: 一時停止中かどうか
  // (画面のアイコン切り替え用のstateと、非同期処理から最新値を読むためのrefの両方を持つ)
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // 🌟 ⏸/⏹中に決まった「botの手」を、盤面に適用せずに預かっておく場所。
  // ▶で再開した時に適用する。⏹の時は捨てる。
  const pendingBotMoveRef = useRef<{ grid: Grid; color: Color } | null>(null);

  // 🌟 bot vs bot 用: 「いま画面で見ている手」。
  // null = 最新の手を追いかけている(ライブ追従中)
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  // 🌟 「ライブ追従中に見せる手」の最新値。非同期のハンドラ(handleViewIndexChange)から
  // 読むための入れ物。描画のあとにeffectで下の followIndex を入れる。
  const followIndexRef = useRef(0);

  // 🌟画面離脱後も推論・タイマー・setStateが走り続けないようにするためのガード
  const isMountedRef = useRef(true);
  const botTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredInitialBotTurnRef = useRef(false);
  // 🌟 botの着手分析が、続けて何回失敗したか(成功したら0に戻す)
  const botFailureCountRef = useRef(0);

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

  // 🌟「いま考え中のbot」が終わるのを待つための仕組み。⏹で使う。
  // 待ち行列に resolve を積んでおいて、botの1手が終わった瞬間に全員起こす。
  const botIdleResolversRef = useRef<(() => void)[]>([]);

  const notifyBotIdle = () => {
    const resolvers = botIdleResolversRef.current;
    botIdleResolversRef.current = [];
    resolvers.forEach((resolve) => resolve());
  };

  const waitForBotIdle = (): Promise<void> => {
    if (!isBotRunningRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      botIdleResolversRef.current.push(resolve);
    });
  };

  // 🌟 liveAnalysis(ref)に溜まった内容を、画面用のstateに流し込む。
  // getRecordAnalysisは毎回新しいオブジェクトを返すので、setStateすれば再描画される。
  const syncLiveAnalysis = () => {
    setLiveAnalysisResult(liveAnalysis.getRecordAnalysis());
  };

  const clearBotTurnTimeout = () => {
    if (botTurnTimeoutRef.current) {
      clearTimeout(botTurnTimeoutRef.current);
      botTurnTimeoutRef.current = null;
    }
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

  const endGame = async (reason?: "resign" | "stop") => {
    if (isGameEndedRef.current) return;
    isGameEndedRef.current = true;
    setIsCalculating(true);

    try {
      if (reason === "stop") {
        // 🌟⏹: bot vs bot を途中で切り上げる。
        // 勝敗なし(result=null)で、地計算もしない(まだ終局していないため)。

        // 考え中のbotがいれば終わるのを待つ。
        // ⏹は先に isPausedRef を true にしているので、その手は「保留」になり、
        // 盤面には適用されない(分析結果だけが記録される)。
        await waitForBotIdle();
        if (!isMountedRef.current) return;

        // 保留されていた手は使わないので捨てる
        pendingBotMoveRef.current = null;

        // 最新局面の分析がまだ無ければ、ここで分析して記録する(盤面には適用しない)
        const latestIndex = movesRef.current.length;
        if (liveAnalysis.getRecordAnalysis().pos[latestIndex] == null) {
          try {
            await liveAnalysis.analyzeAndRecord({
              moveIndex: latestIndex,
              board: boardRef.current,
              movesSoFar: movesRef.current,
            });
          } catch (e) {
            // 分析に失敗しても、途中終了そのものは続ける
            console.warn(
              "[usePracticeSession] 停止時の最新局面の分析に失敗",
              e,
            );
          }
          if (!isMountedRef.current) return;
        }

        setResultRaw(null);
        setResultComment(t("common.matchComplete"));
      } else if (reason === "resign") {
        const currentColor = getCurrentColor();
        const winnerColor = currentColor === BLACK ? WHITE : BLACK;
        const result = `${winnerColor === BLACK ? "B" : "W"}+R`;

        setResultRaw(result);
        setResultComment(
          (isHumanBotMatch
            ? resultToSubjectiveComment(result, myColor ?? BLACK, t)
            : resultToObjectiveComment(result, t)) ?? t("common.matchComplete"),
        );

        await liveAnalysis.waitForPending();
      } else {
        // 最終局面を分析して記録する。手の並びは連続パスで終わっているので、確定した
        // 局面として仕上げられ、仕上げ済みのエントリが返ってくる。
        const entry = await liveAnalysis.analyzeAndRecord({
          moveIndex: movesRef.current.length,
          board: boardRef.current,
          movesSoFar: movesRef.current,
        });
        if (!isMountedRef.current) return;

        // 🌟結果の文字列と地の盤面は、仕上げ済みのエントリから作る。
        // 分析が取れなかった時は、結果なし(⏹で中断した時と同じ扱い)。
        const result = entry ? scoreLeadToResult(entry.scoreLead) : null;
        if (entry) goBoard.setOwnership(entry.ownership);
        setResultRaw(result);
        setResultComment(
          (result === null
            ? null
            : isHumanBotMatch
              ? resultToSubjectiveComment(result, myColor ?? BLACK, t)
              : resultToObjectiveComment(result, t)) ??
            t("common.matchComplete"),
        );
      }
    } catch (e) {
      // 🛡️ 途中で例外が出ても、画面(LoadingModal)が固まらないように、
      //   結果なしの「対局終了」として締める。
      console.warn(
        "[usePracticeSession] 終局処理に失敗。結果なしで終了します",
        e,
      );
      setResultRaw(null);
      setResultComment(t("common.matchComplete"));
    }

    // どの終わり方でも共通の後始末
    if (!isMountedRef.current) return;
    setLiveAnalysisResult(liveAnalysis.getRecordAnalysis());
    setIsCalculating(false);
    setIsGameEnded(true);
  };

  // 🌟 botの手が盤面に適用された「後」の処理。連続パスなら終局、
  // そうでなければ次のbotの手へ。(▶再開時に、預かっていた手を適用した後でも使う)
  const continueAfterBotMove = async () => {
    const moves = movesRef.current;
    const reachedDoublePass = endsWithDoublePass(moves);

    if (reachedDoublePass) {
      // bot vs bot: 終局の連続パスを観戦者が見られるように、少し待ってから終局処理へ。
      // 画面は「分析が届いた局面まで」を見せているので、この間は1回目のパスまでが映っている。
      if (isBotBotMatch) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, BOTBOT_FINAL_PASS_VIEW_MS),
        );
        if (!isMountedRef.current) return;
      }
      await endGame();
    } else {
      const nextPlayer = getCurrentPlayer();
      // ⏸中は、次の手のタイマーも仕掛けない
      if (nextPlayer.username !== "you" && !isPausedRef.current) {
        botTurnTimeoutRef.current = setTimeout(() => {
          botTurnTimeoutRef.current = null;
          if (isMountedRef.current && !isPausedRef.current) {
            runBotTurnIfNeeded();
          }
        }, 100);
      }
    }
  };

  const runBotTurnIfNeeded = async () => {
    if (!isMountedRef.current) return;
    if (isGameEndedRef.current || isBotRunningRef.current) return;
    // ⏸中は、新しいお願い(次のKataGo呼び出し)を出さない
    if (isPausedRef.current) return;

    const colorToMove = getCurrentColor();
    const activePlayer = getCurrentPlayer();

    if (activePlayer.username === "you") return;

    isBotRunningRef.current = true;
    setIsBotThinking(true);

    // 🌟 やり直しを使い切った時だけ true。botの「考え中」を解いた後で、対局を締める。
    let shouldGiveUp = false;

    try {
      const botMoveIndex = movesRef.current.length;
      // 分析した局面までの手の並び。手の配列は更新のたびに新しく作り直されるので、
      // ここで握っておけば、あとから変わっても影響されない。
      const movesSoFar = movesRef.current;
      const botMove = colorToMove === BLACK ? blackBotMove : whiteBotMove;
      const succeeded = await botMove.runBotTurn(
        boardRef.current,
        movesRef.current,
        matchType,
        (grid, analysis) => {
          if (!isMountedRef.current) return;

          // 分析結果は、⏸/⏹中でも常に記録する(KataGoは止めないので無駄にしない)。
          // 記録すると onRecorded 経由で画面のstateにも流れる。
          liveAnalysis.record(botMoveIndex, analysis, movesSoFar);

          // ⏸/⏹中なら、この手は盤面に適用せず預かっておく
          if (isPausedRef.current) {
            pendingBotMoveRef.current = { grid, color: colorToMove };
            return;
          }

          goBoard.applyTrustedMove(grid, colorToMove);
        },
      );

      if (!isMountedRef.current) return;

      if (!succeeded) {
        // 🌟 分析に失敗した。待ち時間を増やしながらやり直し、回数を超えたら諦める。
        botFailureCountRef.current += 1;
        if (botFailureCountRef.current > BOT_RETRY_MAX) {
          shouldGiveUp = true;
        } else {
          botTurnTimeoutRef.current = setTimeout(() => {
            botTurnTimeoutRef.current = null;
            if (isMountedRef.current && !isPausedRef.current) {
              runBotTurnIfNeeded();
            }
          }, BOT_RETRY_WAIT_MS * botFailureCountRef.current);
        }
      } else {
        botFailureCountRef.current = 0;

        // 手を預かっている(=⏸/⏹中に決まった)なら、続きは▶で再開した時に
        if (pendingBotMoveRef.current) return;

        await continueAfterBotMove();
      }
    } finally {
      if (isMountedRef.current) {
        setIsBotThinking(false);
      }
      isBotRunningRef.current = false;
      // ⏹で待っている人がいれば起こす
      notifyBotIdle();
    }

    // 🌟 やり直しを使い切った。結果なしの「対局終了」にする(⏹で中断した時と同じ扱い)。
    if (shouldGiveUp) {
      console.warn(
        "[usePracticeSession] botの分析に失敗し続けたので対局を終了します",
      );
      await endGame("stop");
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
    const reachedDoublePass = endsWithDoublePass(moves);

    if (reachedDoublePass) {
      await endGame();
      return;
    }

    await runBotTurnIfNeeded();
  };

  // 🌟最新のhandlePutStoneを指すref。強制パスは、分析を待った後に呼ぶので、
  //   古い関数(古いisBotThinkingを握っている)を使ってしまわないため。
  const handlePutStoneRef = useRef(handlePutStone);
  useEffect(() => {
    handlePutStoneRef.current = handlePutStone;
  });

  const handleResign = () => {
    if (isGameEndedRef.current || isBotThinking) return;
    endGame("resign");
  };

  // 🌟パスを打つ前に、確認のモーダルを出すべきか。
  //   今の局面が、分析のownershipから「未終局」と判定された時だけtrue。
  //   分析がまだ届いていない/取れなかった時は、判定できないのでfalse
  //   (=確認なしでパスできる。操作をじゃましない)。
  const shouldConfirmPass = (): boolean => {
    const moves = movesRef.current;
    const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
    const lastBoard = goBoard.boardHistoryRef.current[moves.length - 1];

    return (
      liveAnalysis.isPositionUnfinished(boardRef.current, movesRef.current) ===
        true && // && コウがない。一見終局していなさそうだが、コウのため打てず、パスするしかないことがある。そういうときにパスモーダルを出すのは不適なため、回避する
      !(
        lastBoard &&
        hasKoPoint(
          boardSize,
          getCurrentColor(),
          lastMove,
          boardRef.current,
          lastBoard,
        )
      )
    );
  };
  // 🌟 ⏸ / ▶ の切り替え。
  // ⏸: 考え中のKataGoは止めない。分析結果は記録するが、そこで決まった手は
  //     盤面に適用せず預かっておく(runBotTurnIfNeeded のコールバック側)。
  // ▶: 預かっていた手があれば、ここで初めて適用して続きへ。
  //     見ている手も最新に戻して、ライブ追従に復帰する。
  const handleTogglePause = () => {
    if (isGameEndedRef.current) return;

    if (!isPausedRef.current) {
      isPausedRef.current = true;
      setIsPaused(true);
      clearBotTurnTimeout();
      return;
    }

    isPausedRef.current = false;
    setIsPaused(false);
    setViewIndex(null);

    const pending = pendingBotMoveRef.current;
    if (pending) {
      pendingBotMoveRef.current = null;
      goBoard.applyTrustedMove(pending.grid, pending.color);
      continueAfterBotMove();
    } else {
      // まだ考え中なら、ここは何もせず戻る(考え終わった手は普通に適用される)
      runBotTurnIfNeeded();
    }
  };

  // 🌟 ⏹: 対局を途中で切り上げる(BoardEditScreenへの遷移は画面側のisGameEnded effectがやる)
  const handleStop = () => {
    if (isGameEndedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    clearBotTurnTimeout();
    endGame("stop");
  };

  // 🌟 スライダー/◀▶から呼ばれる「見ている手」の更新。
  // ScoreLeadReplayControls は setState と同じ形(値 or 関数)で呼んでくるので、
  // Dispatch<SetStateAction<number>> の形で受ける。
  // 見せられる最新の手(followIndex)まで来たら null に戻して、ライブ追従を再開する。
  // (メモ化はReact Compilerが自動でやってくれるので、useCallbackは使わない)
  const handleViewIndexChange: Dispatch<SetStateAction<number>> = (
    action: SetStateAction<number>,
  ) => {
    setViewIndex((prev) => {
      const max = followIndexRef.current;
      const base = prev ?? max;
      const next = typeof action === "function" ? action(base) : action;
      const clamped = Math.max(0, Math.min(next, max));
      return clamped >= max ? null : clamped;
    });
  };
  // 🌟このフック自身がマウントされた時点で「対局開始」が確定している
  // (呼び出し元のPracticeGameScreenContentは「対局開始」ボタンが
  // 押された時にだけマウントされるため)。黒番がbotならマウント直後に
  // 初手を打たせる。
  useEffect(() => {
    if (hasTriggeredInitialBotTurnRef.current) return;
    hasTriggeredInitialBotTurnRef.current = true;
    runBotTurnIfNeeded();
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

    // 連続パスで終わっている(終局)なら、「次の一手」は存在しないので分析しない
    if (endsWithDoublePass(moves)) return;

    const board = goBoard.boardHistoryRef.current[nextMoveIndex];
    if (!board) return;

    // 投げっぱなしでよい(記録・付箋の更新・件数管理は中でやってくれる。
    // 画面離脱後の記録スキップもhook側でやっている)。
    // 2026/10/19
    // 人間 対 bot の時は、相手がパスした局面で終局の2段階確認をして、
    // 確定したら自動でパスする。
    liveAnalysis
      .analyzeForTurn({
        moveIndex: nextMoveIndex,
        board,
        movesSoFar: moves,
        checkAutoPass: isHumanBotMatch,
      })
      .then((shouldPass) => {
        if (!shouldPass) return;
        // 待っている間に、画面を離れた/終局した/局面が進んだ時は、何もしない
        if (!isMountedRef.current || isGameEndedRef.current) return;
        if (movesRef.current.length !== nextMoveIndex) return;
        console.log("🏳️ 終局が確定したので、自動でパスします");
        // パスを決めた瞬間に、画面側にモーダルを出してもらう(出す・消すは画面の仕事)
        // setHasAutoPassed(true);
        handlePutStoneRef.current(PASS_GRID);
      });
  }, [goBoard.moves]);

  // ================================================
  //     PlayerCard 用の表示情報（黒/白ではなく上/下で組み立てる）
  // ================================================

  // 🌟 ライブ追従中に「どの手まで見せるか」。
  // bot vs bot は、分析が届いた局面までを見せる。分析は「次の手が決まる時」に届くので、
  // 通常は実際の対局より1手だけ遅れる(⏸中は、考え中だった局面の分析が先に届くので最新まで見える)。
  // 人間が入る対局は今までどおり、常に最新。
  const latestIndex = goBoard.moves.length;
  const hasLatestAnalysis = liveAnalysisResult.pos[latestIndex] != null;
  const followIndex =
    isBotBotMatch && !hasLatestAnalysis
      ? Math.max(0, latestIndex - 1)
      : latestIndex;

  // 🌟 followIndexRef は描画の最中ではなく、描画のあとのeffectで更新する。
  useEffect(() => {
    followIndexRef.current = followIndex;
  }, [followIndex]);

  // 🌟 画面に見せる手。viewIndexがnullなら followIndex、あれば見ている手。
  const currentIndex = viewIndex ?? followIndex;

  const currentAgehama = goBoard.agehamaHistory[currentIndex] ?? {
    black: 0,
    white: 0,
  };
  const moveHistoryUpToCurrent =
    goBoard.moves?.slice(0, currentIndex + 1) ?? [];
  const { isBlackPass, isWhitePass } = getPassState(
    currentIndex,
    moveHistoryUpToCurrent,
    matchType,
  );

  const buildPlayerCard = (
    color: Color,
    info: { username: string; iconIndex: number; rating: number },
  ): PlayerCardView => ({
    ...info,
    color,
    showPass: color === BLACK ? isBlackPass : isWhitePass,
    agehamaCount: color === BLACK ? currentAgehama.black : currentAgehama.white,
  });

  const topPlayer = buildPlayerCard(isHumanBotMatch ? oppColor : WHITE, {
    username: isHumanBotMatch
      ? opponentBotProfile.username
      : whitePlayer.username,
    iconIndex: isHumanBotMatch
      ? opponentBotProfile.iconIndex
      : whitePlayer.iconIndex,
    rating: isHumanBotMatch ? opponentBotProfile.rating : whitePlayer.rating,
  });

  const bottomPlayer = buildPlayerCard(
    (isHumanBotMatch ? myColor : BLACK) ?? BLACK,
    {
      username:
        isHumanHumanMatch || isBotBotMatch
          ? blackPlayer.username
          : (t("common.you") ?? ""), // ⚠️2026/10/06: ここはyou!!大事
      iconIndex: (isHumanBotMatch ? iconIndex : blackPlayer.iconIndex) ?? 0,
      rating:
        (isHumanBotMatch ? myRatingForBoardSize : blackPlayer.rating) ?? 0,
    },
  );

  // 🌟対局開始モーダル用の表示情報を組み立てるヘルパー
  const getPlayerGameStartInfo = (player: PlayerType) => {
    if (isBot(player.username)) {
      const profile = getBotProfile(player.username as BotUsername, boardSize);
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

  // 🌟 今の局面の「パスしていいか」の判断が終わったか。
  //   終わるまでは、画面のパスボタンを押せないようにする。
  const isPassReady = liveAnalysis.isPositionJudged(goBoard.moves.length);

  return {
    boardHistory: goBoard.boardHistory,
    agehamaHistory: goBoard.agehamaHistory,
    moves: goBoard.moves,
    movesRef,
    currentIndex,
    maxViewIndex: followIndex,
    setCurrentIndex: handleViewIndexChange,
    ownership: goBoard.ownership,
    isGameEnded,
    isBotThinking,
    handlePutStone,
    handleResign,
    shouldConfirmPass,
    isPassReady,
    handleTogglePause,
    handleStop,
    isPaused,
    topPlayer,
    bottomPlayer,
    resultRaw,
    resultComment,
    liveAnalysisResult,
    practiceMatchStatus,
    myColor,
    opponentBotProfile,
    getPlayerGameStartInfo,
    iconIndex,
    myRatingForBoardSize,
    isDoublePass,
    isCalculating,
    isHumanBotMatch,
    showOwnership,
    showWinRateBar,
    showMode,
    isSoundEnabled,
    doubleTap,
  };
};
