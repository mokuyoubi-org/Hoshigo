// TurnstileWidget.web.tsx
// web版のTurnstile実装。目に見えないウィジェット(managed + interaction-only)を
// 常時マウントしておき、getToken()を呼ぶたびに新しいトークンを取得する。

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { View } from "react-native";

console.log("TurnstileWidget.web.tsx");

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const SCRIPT_ID = "cf-turnstile-script";

export type TurnstileHandle = {
  getToken: () => Promise<string>;
};

type Props = {
  sitekey: string;
  action?: string; // Supabaseのanonymous sign-inを識別するaction名(任意)
};

// スクリプトタグが未挿入なら挿入し、読み込み完了を待つ
function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Turnstile script failed to load"))
      );
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
}

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  ({ sitekey, action = "anonymous_signin" }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const pendingRef = useRef<{
      resolve: (token: string) => void;
      reject: (err: Error) => void;
    } | null>(null);

    // ウィジェットの準備が整うまでgetToken()を待たせるためのPromise
    const readyResolveRef = useRef<(() => void) | null>(null);
    const readyPromiseRef = useRef<Promise<void>>(
      new Promise((resolve) => {
        readyResolveRef.current = resolve;
      })
    );

    useEffect(() => {
      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey,
            action,
            appearance: "interaction-only", // 通常は完全に非表示
            execution: "execute", // renderしただけでは走らせない
            callback: (token: string) => {
              pendingRef.current?.resolve(token);
              pendingRef.current = null;
            },
            "error-callback": () => {
              pendingRef.current?.reject(new Error("Turnstile challenge failed"));
              pendingRef.current = null;
            },
          });

          readyResolveRef.current?.();
        })
        .catch((err) => {
          console.error("Turnstile init error:", err);
        });

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }, []);

    // 同時に複数箇所からgetToken()が呼ばれても、後勝ちで前の呼び出し元が
    // 無反応(ハング)にならないよう、直列化する(KataGoEngineContextの
    // isAnalyzingRef と同じ考え方)。
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());

    const getTokenInternal = (): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        if (!widgetIdRef.current || !window.turnstile) {
          reject(new Error("Turnstile widget not ready"));
          return;
        }
        pendingRef.current = { resolve, reject };
        window.turnstile.reset(widgetIdRef.current);
        window.turnstile.execute(widgetIdRef.current);
      });
    };

    useImperativeHandle(ref, () => ({
      getToken: () => {
        const run = queueRef.current
          .catch(() => {
            // 前の呼び出しが失敗していても、キューは止めない
          })
          .then(async () => {
            // 準備が整うまで最大10秒待つ(それ以上はネットワーク不調などとみなす)
            await Promise.race([
              readyPromiseRef.current,
              new Promise<void>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error("Turnstile widget did not become ready in time")
                    ),
                  10000
                )
              ),
            ]);
            return getTokenInternal();
          });

        // 次の呼び出しは、これが終わってから(成功/失敗問わず)始まる
        queueRef.current = run.catch(() => {});
        return run as Promise<string>;
      },
    }));

    // 完全に見えないので、サイズ0のViewでOK
    return (
      <View style={{ width: 0, height: 0, overflow: "hidden" }}>
        <div ref={containerRef} />
      </View>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}