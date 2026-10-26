// useMatchingProvider.ts
// 2026/10/12: Cloudflare版(WebSocketの待機列)へ付け替え
// マッチングの状態管理と、開始/キャンセル処理のロジック本体。
// MatchingContext.tsx から呼ばれる想定。
//
// 流れ:待機列のトランシーバー(/ws/queue/:boardSize)をつなぐ
//   → サーバーが組んでくれたら "matched" が届く → 対局画面へ
//   → すでに対局中なら "resume" が届く → 対局画面へ復帰
import { formatPlayingParams } from "@/src/logics/rpc/matchingRPC";
import { connectWs, WsConnection } from "@/src/services/api/ws";
import { ensureSession } from "@/src/services/auth/ensureSession";
import { router } from "expo-router";
import { BoardSize } from "go-core";
import { useCallback, useEffect, useRef, useState } from "react";

export const useMatchingProvider = (
  // ログインしていない人が、対局ボタンを押した瞬間に呼ばれる。
  // 「ログインしてください」モーダルなどのUI関心事は、呼び出し元の責務にする。
  onLoginRequired: () => void,
) => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchingBoardSize, setMatchingBoardSize] = useState<BoardSize | null>(
    null,
  );
  const connectionRef = useRef<WsConnection | null>(null);

  // 「何回目の挑戦か」の番号札。つなぐ途中でキャンセルされたり、
  // 終わったあとに遅れて届いたメッセージを、無視するために使う。
  const attemptRef = useRef(0);

  // 🔒公開しない
  const closeConnection = useCallback(() => {
    if (connectionRef.current) {
      console.log("🐱 待機列の接続を切断した");
      connectionRef.current.close();
      connectionRef.current = null;
    }
  }, []);

  // 🔒公開しない:マッチングを終わらせて、元の状態に戻す
  const finish = useCallback(() => {
    attemptRef.current += 1; // これ以降に届くものは、全部無視
    closeConnection();
    setIsMatching(false);
    setMatchingBoardSize(null);
  }, [closeConnection]);

  // 画面ごと消えるときは、トランシーバーを切っておく
  useEffect(() => {
    return () => {
      attemptRef.current += 1;
      closeConnection();
    };
  }, [closeConnection]);

  // マッチング開始!
  const startMatching = async (boardSize: BoardSize) => {
    // 🛡️ガード(連打対策)
    if (isMatching) return;

    // 🐱 連打対策も兼ねて、つなぐより先にフラグを立てておく
    setIsMatching(true);
    setMatchingBoardSize(boardSize);

    closeConnection(); // 開始前に古い接続があれば切る
    const myAttempt = ++attemptRef.current;

    console.log("🐱 マッチング開始!");

    try {
      // 🎫 ログインしていなければ(ビジター)、ここで「ログインしてください」を出す。
      // サーバーの待機列は、ログインしている人しか入れないため
      const ready = await ensureSession();
      // 確認の途中でキャンセルされていたら、ここで終わり
      if (attemptRef.current !== myAttempt) return;
      if (!ready) {
        finish();
        onLoginRequired();
        return;
      }

      const conn = await connectWs(`/ws/queue/${boardSize}`, {
        onMessage: (msg) => {
          if (attemptRef.current !== myAttempt) return;

          switch (msg.type) {
            case "queued":
              // 順番待ちの列に入れた。あとは、待つだけ
              console.log("🐱 待機列に入った");
              break;

            case "matched":
            case "resume": {
              // matched = 新しい対局が決まった / resume = すでに対局中なので復帰
              console.log(`🐱 ${msg.type}:`, msg.match);
              finish();
              setTimeout(() => {
                router.replace({
                  pathname: "/GameScreen",
                  params: formatPlayingParams(msg.match),
                });
              }, 0);
              break;
            }

            case "canceled":
              console.log("🐱 キャンセルできた");
              finish();
              break;

            case "error":
              finish();
              // メンテナンス・バージョン不足は、ws.ts がもう知らせている
              console.error("待機列のエラー:", msg.error);
              break;
          }
        },

        onClose: () => {
          // 自分で閉じたとき・終わったあとは、番号札が変わっているので無視される。
          // ここに来るのは、「待っている途中で、回線が切れた」ときだけ
          if (attemptRef.current !== myAttempt) return;
          console.log("🐱 待機列の接続が、途中で切れた");
          finish();
        },
      });

      // つなぐ途中でキャンセルされていたら、つながった接続は、すぐ切る
      if (attemptRef.current !== myAttempt) {
        conn.close();
        return;
      }

      connectionRef.current = conn;
    } catch (e) {
      // つなげなかった。キャンセル済みなら、何もしない
      if (attemptRef.current !== myAttempt) return;
      console.error("待機列につなげなかった:", e);
      finish();
    }
  };

  // キャンセルボタン押した
  const cancelMatching = () => {
    const conn = connectionRef.current;

    if (conn) {
      // 🐱 サーバーに「やめます」と伝える。返事("canceled")が届いたら、finish() される。
      //    もし、ちょうど対局が決まっていたら、"matched" のほうが届いて、そのまま対局画面へ行く
      conn.send({ type: "cancel" }); // 🌟WSで送ってるところ
      return;
    }

    // まだつなぎ中だった場合:番号札を変えて、つながった瞬間に切られるようにする
    attemptRef.current += 1;
    setIsMatching(false);
    setMatchingBoardSize(null);
  };

  return {
    isMatching,
    matchingBoardSize,
    startMatching,
    cancelMatching,
  };
};
