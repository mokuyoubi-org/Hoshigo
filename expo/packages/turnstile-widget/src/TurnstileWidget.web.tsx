// TurnstileWidget.web.tsx
// web版のTurnstile実装。通常は目に見えないウィジェット(managed + interaction-only)を
// 常時マウントしておき、getToken()を呼ぶたびに新しいトークンを取得する。
// Cloudflareが「追加チェックが必要」と判断したときだけ、画面中央にチェックボックスを出す。

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const SCRIPT_ID = "cf-turnstile-script";

// 通常のトークン取得を待つ時間
const TOKEN_TIMEOUT_MS = 15000;
// 人間がチェックボックスを押す時間も含めて待つ時間
const INTERACTIVE_TIMEOUT_MS = 60000;
// ウィジェットの準備を待つ時間(それ以上はネットワーク不調などとみなす)
const READY_TIMEOUT_MS = 10000;

export type TurnstileHandle = {
  getToken: () => Promise<string>;
};

type Props = {
  sitekey: string;
  // web版では未使用。native版とprops形状を揃えて呼び出し側の型エラーを防ぐためだけに受け取る
  bgColor?: string;
  textColor?: string;
  spinnerColor?: string;
  spinnerTrackColor?: string;
  lang?: string;
};

// スクリプトタグが未挿入なら挿入し、読み込み完了を待つ
const loadTurnstileScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const onError = () => reject(new Error("Turnstile script failed to load"));
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", onError);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = onError;
    document.head.appendChild(script);
  });

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  ({ sitekey }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const pendingRef = useRef<{
      resolve: (token: string) => void;
      reject: (err: Error) => void;
    } | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // true の間だけ、チェックボックスを画面中央に出す
    const [needsInteraction, setNeedsInteraction] = useState(false);

    // ウィジェットの準備が整うまでgetToken()を待たせるためのPromise
    // ⚠️ useRef(new Promise(...)) と書くと、描画のたびにPromiseが作り直されて
    // resolveがずれてしまうので、最初の1回だけ作る。
    const readyResolveRef = useRef<(() => void) | null>(null);
    const readyPromiseRef = useRef<Promise<void> | null>(null);
    if (readyPromiseRef.current === null) {
      readyPromiseRef.current = new Promise<void>((resolve) => {
        readyResolveRef.current = resolve;
      });
    }

    // タイムアウトタイマーを止める
    const clearPendingTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // callback/error-callbackが何らかの理由で一切飛んでこなかった場合の保険。
    // これが無いと、pendingRefが永遠にresolve/rejectされずPromiseがハングする。
    const startPendingTimeout = (ms: number) => {
      clearPendingTimeout();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        // 待っている人がいなくても、チェックボックスの表示は必ず消す
        setNeedsInteraction(false);
        pendingRef.current?.reject(
          new Error("Turnstile token request timed out"),
        );
        pendingRef.current = null;
      }, ms);
    };

    // 待っている getToken() を失敗で終わらせる(タイマーも、表示も、片づける)
    const rejectPending = (message: string) => {
      clearPendingTimeout();
      setNeedsInteraction(false);
      pendingRef.current?.reject(new Error(message));
      pendingRef.current = null;
    };

    useEffect(() => {
      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          // 🛡️ガード
          if (cancelled || !containerRef.current || !window.turnstile) return;

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey,
            appearance: "interaction-only", // 通常は完全に非表示
            execution: "execute", // renderしただけでは走らせない
            // 期限切れのトークンを勝手に作り直さない(作り直されると、誰も待っていないのに
            // チェックボックスが出てしまうことがあるため)
            "refresh-expired": "manual",
            callback: (token: string) => {
              clearPendingTimeout();
              setNeedsInteraction(false);
              pendingRef.current?.resolve(token);
              pendingRef.current = null;
            },
            "error-callback": (errorCode?: string) => {
              console.error("Turnstile error-callback:", errorCode);
              rejectPending(`Turnstile challenge failed: ${errorCode ?? ""}`);
            },
            // 追加チェック(人間確認)が始まる直前。ここで入れ物を見える状態にする
            "before-interactive-callback": () => {
              setNeedsInteraction(true);
              startPendingTimeout(INTERACTIVE_TIMEOUT_MS);
            },
            // 追加チェックが終わった直後
            "after-interactive-callback": () => {
              setNeedsInteraction(false);
              startPendingTimeout(TOKEN_TIMEOUT_MS);
            },
            // 追加チェックの途中で、時間切れになった
            "timeout-callback": () => {
              rejectPending("Turnstile interactive challenge timed out");
            },
            // トークンの有効期限が切れた
            "expired-callback": () => {
              rejectPending("Turnstile token expired");
            },
          });

          readyResolveRef.current?.();
        })
        .catch((err) => {
          console.error("Turnstile init error:", err);
        });

      return () => {
        cancelled = true;
        clearPendingTimeout();
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }, []);

    // 同時に複数箇所からgetToken()が呼ばれても、後勝ちで前の呼び出し元が
    // 無反応(ハング)にならないよう、直列化する。
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());

    const getTokenInternal = (): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        if (!widgetIdRef.current || !window.turnstile) {
          reject(new Error("Turnstile widget not ready"));
          return;
        }

        pendingRef.current = { resolve, reject };
        startPendingTimeout(TOKEN_TIMEOUT_MS);

        window.turnstile.reset(widgetIdRef.current);
        window.turnstile.execute(widgetIdRef.current);
      });

    useImperativeHandle(ref, () => ({
      getToken: () => {
        const run = queueRef.current
          .catch(() => {
            // 前の呼び出しが失敗していても、キューは止めない
          })
          .then(async () => {
            await Promise.race([
              readyPromiseRef.current,
              new Promise<void>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "Turnstile widget did not become ready in time",
                      ),
                    ),
                  READY_TIMEOUT_MS,
                ),
              ),
            ]);
            return getTokenInternal();
          });

        // 次の呼び出しは、これが終わってから(成功/失敗問わず)始まる
        queueRef.current = run.catch(() => {});
        return run as Promise<string>;
      },
    }));

    // 普段はサイズ0で見えない。追加チェックが必要なときだけ、画面中央に出す。
    // ⚠️ 同じ<div ref={containerRef}>のまま、外側のstyleだけ切り替える(ウィジェットを作り直さないため)
    return (
      <div
        style={
          needsInteraction
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              }
            : { width: 0, height: 0, overflow: "hidden" }
        }
      >
        <div ref={containerRef} />
      </div>
    );
  },
);

TurnstileWidget.displayName = "TurnstileWidget";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}
