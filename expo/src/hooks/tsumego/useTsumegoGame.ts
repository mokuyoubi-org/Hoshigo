// Hoshigo
// expo/src/hooks/tsumego/useTsumegoGame.ts
// 詰碁を「1問」解くフック。
// 石を置くたびに、正解・不正解の「木」と見比べる。
//   - 木の中の手で、result が "correct" → 正解で終わり
//   - 木の中の手で、result が "wrong"   → children の反撃の手順を再生して、不正解で終わり
//   - 木の中の手で、result なし        → 相手が children の先頭の手を打ち返して、続く
//   - 木にない手                       → 不正解で終わり(反撃の再生はなし)
//   - 手のあと、続きの枝が1つもなければ、正解で終わり
// 終わった時に、onFinish("solved" か "failed")を呼ぶ。

import { TsumegoNode, TsumegoType } from "@/src/types/tsumego";
import {
  applyMove,
  BLACK,
  Board,
  Color,
  getOppositeColor,
  Grid,
  initBoard,
  isLegalMove,
  stonesToBoard,
  WHITE,
} from "go-core";
import { useEffect, useRef, useState } from "react";

// 相手の手(や反撃の再生)を、この時間だけ待ってから打つ(ミリ秒)
const REPLY_DELAY_MS = 500;

export type TsumegoStatus = "playing" | "correct" | "wrong";

export const useTsumegoGame = (
  problem: TsumegoType,
  onFinish?: (result: "solved" | "failed") => void,
) => {
  const boardSize = problem.board_size;
  // 人が打つ色 = 最初の手番の色
  const userColor: Color = problem.to_play === "black" ? BLACK : WHITE;
  const opponentColor = getOppositeColor(userColor);

  // 最初の局面(1回だけ作る)
  const [initialBoard] = useState<Board>(() =>
    stonesToBoard(boardSize, problem.black_stones, problem.white_stones),
  );

  // 画面に出す値はstate、非同期のタイマーから読む値はref
  const boardHistoryRef = useRef<Board[]>([initialBoard]);
  const movesRef = useRef<Grid[]>([]);
  const [boardHistory, setBoardHistory] = useState<Board[]>([initialBoard]);
  const [moves, setMoves] = useState<Grid[]>([]);
  const [status, setStatus] = useState<TsumegoStatus>("playing");
  const [comment, setComment] = useState<string | null>(null);
  // 相手の手(や反撃)を再生している間は、人は打てない
  const [isOpponentTurn, setIsOpponentTurn] = useState(false);

  // いま人が打てる「手の候補」(木の、いまの深さの枝)
  const candidatesRef = useRef<TsumegoNode[]>(problem.tree);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // 🌟最新のonFinishを指すref。タイマーの中から呼ぶので、古い関数を使わないため。
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, []);

  // 少し待ってから、続きをやる(画面を離れていたら、やらない)
  const schedule = (fn: () => void) => {
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (isMountedRef.current) fn();
    }, REPLY_DELAY_MS);
  };

  const finish = (result: "correct" | "wrong") => {
    setStatus(result);
    setIsOpponentTurn(false);
    onFinishRef.current?.(result === "correct" ? "solved" : "failed");
  };

  // 石を1つ置く。打てない場所ならfalseを返して、何もしない
  const playMove = (grid: Grid, color: Color): boolean => {
    const boards = boardHistoryRef.current;
    const board = boards[boards.length - 1];
    const lastBoard = boards[boards.length - 2] ?? initBoard(boardSize);
    const lastMove = movesRef.current[movesRef.current.length - 1] ?? null;
    if (!isLegalMove(boardSize, grid, board, lastMove, color, lastBoard)) {
      return false;
    }
    const { board: nextBoard } = applyMove(boardSize, grid, board, color);
    boardHistoryRef.current = [...boards, nextBoard];
    movesRef.current = [...movesRef.current, grid];
    setBoardHistory(boardHistoryRef.current);
    setMoves(movesRef.current);
    return true;
  };

  // 反撃の手順を、先頭の枝をたどって順番に再生する。最後まで打ったら、不正解で終わる
  const playRefutation = (nodes: TsumegoNode[], color: Color) => {
    const node = nodes[0];
    if (!node || !playMove(node.move, color)) {
      finish("wrong");
      return;
    }
    if (node.comment) setComment(node.comment);
    schedule(() => playRefutation(node.children ?? [], getOppositeColor(color)));
  };

  // 木の中の手を打ったあとの続き
  const handleNodeAfterUserMove = (node: TsumegoNode) => {
    setComment(node.comment ?? null);

    if (node.result === "correct") {
      finish("correct");
      return;
    }
    setIsOpponentTurn(true);

    if (node.result === "wrong") {
      schedule(() => playRefutation(node.children ?? [], opponentColor));
      return;
    }

    // 続きがあるなら、相手が先頭の枝を打ち返す。続きがなければ、正解
    const reply = node.children?.[0];
    if (!reply) {
      finish("correct");
      return;
    }
    schedule(() => {
      if (!playMove(reply.move, opponentColor)) {
        console.warn("[useTsumegoGame] 相手の手が打てない(問題データを確認)");
        finish("wrong");
        return;
      }
      if (reply.comment) setComment(reply.comment);
      if (reply.result) {
        finish(reply.result);
        return;
      }
      const next = reply.children ?? [];
      if (next.length === 0) {
        finish("correct");
        return;
      }
      candidatesRef.current = next;
      setIsOpponentTurn(false);
    });
  };

  // 盤をタップした時
  const handlePutStone = (grid: Grid) => {
    if (status !== "playing" || isOpponentTurn) return;
    if (!playMove(grid, userColor)) return;

    const node = candidatesRef.current.find((n) => n.move === grid);
    if (!node) {
      // 木にない手は、反撃の再生なしで、不正解
      setComment(null);
      finish("wrong");
      return;
    }
    handleNodeAfterUserMove(node);
  };

  // 最初からやり直す
  const reset = () => {
    clearTimer();
    boardHistoryRef.current = [initialBoard];
    movesRef.current = [];
    candidatesRef.current = problem.tree;
    setBoardHistory([initialBoard]);
    setMoves([]);
    setStatus("playing");
    setComment(null);
    setIsOpponentTurn(false);
  };

  return {
    board: boardHistory[boardHistory.length - 1],
    boardHistory,
    moves,
    currentIndex: moves.length,
    status,
    comment,
    isOpponentTurn,
    userColor,
    handlePutStone,
    reset,
  };
};