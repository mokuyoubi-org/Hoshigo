// TurnstileWidget.tsx
// ネイティブ(iOS/Android)版のTurnstile実装。
// WebView内で見えないTurnstileチャレンジを実行し、
// postMessage経由でトークンをRN側に受け渡す。

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

console.log("TurnstileWidget.native.tsx");

export type TurnstileHandle = {
  getToken: () => Promise<string>;
};

type Props = {
  sitekey: string;
  action?: string;
};

// WebView内で読み込む、見えないだけの最小HTML。
// callbackでトークンを取得したら、RN側にpostMessageで送る。
function buildHtml(sitekey: string, action: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>html,body{margin:0;padding:0;background:transparent;}</style>
  </head>
  <body>
    <div id="cf-container"></div>
    <script>
      var widgetId = null;

      function postToRN(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      function initTurnstile() {
        if (!window.turnstile) {
          setTimeout(initTurnstile, 100);
          return;
        }
        widgetId = window.turnstile.render("#cf-container", {
          sitekey: "${sitekey}",
          action: "${action}",
          appearance: "interaction-only",
          execution: "execute",
          callback: function (token) {
            postToRN({ type: "token", token: token });
          },
          "error-callback": function (code) {
            postToRN({ type: "error", message: "challenge_failed", code: code });
          }
        });
        postToRN({ type: "ready" });
      }

      // RN側からのgetToken要求を受け取る
      document.addEventListener("message", handleMessage); // Android
      window.addEventListener("message", handleMessage); // iOS

      function handleMessage(event) {
        try {
          var data = JSON.parse(event.data);
          if (data.type === "execute" && widgetId) {
            window.turnstile.reset(widgetId);
            window.turnstile.execute(widgetId);
          }
        } catch (e) {}
      }

      initTurnstile();
    </script>
  </body>
</html>
`;
}

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  ({ sitekey, action = "anonymous_signin" }, ref) => {
    const webviewRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<{
      resolve: (token: string) => void;
      reject: (err: Error) => void;
    } | null>(null);

    // WebView側の準備が整うまでgetToken()を待たせるためのPromise
    const readyResolveRef = useRef<(() => void) | null>(null);
    const readyPromiseRef = useRef<Promise<void>>(
      new Promise((resolve) => {
        readyResolveRef.current = resolve;
      })
    );

    const html = buildHtml(sitekey, action);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "ready") {
          readyRef.current = true;
          readyResolveRef.current?.();
        } else if (data.type === "token") {
          pendingRef.current?.resolve(data.token);
          pendingRef.current = null;
        } else if (data.type === "error") {
          console.error("Turnstile error code:", data.code);
          pendingRef.current?.reject(new Error("Turnstile challenge failed"));
          pendingRef.current = null;
        }
      } catch (e) {
        console.error("Turnstile message parse error:", e);
      }
    };

    // 同時に複数箇所からgetToken()が呼ばれても、後勝ちで前の呼び出し元が
    // 無反応(ハング)にならないよう、直列化する(KataGoEngineContextの
    // isAnalyzingRef と同じ考え方)。
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());

const getTokenInternal = (): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    if (!readyRef.current || !webviewRef.current) {
      reject(new Error("Turnstile widget not ready"));
      return;
    }

    // callback/error-callbackが何らかの理由で一切飛んでこなかった場合の保険。
    // これが無いと、pendingRefが永遠にresolve/rejectされずPromiseがハングする。
    const timeoutId = setTimeout(() => {
      if (pendingRef.current) {
        pendingRef.current = null;
        reject(new Error("Turnstile token request timed out"));
      }
    }, 15000);

    pendingRef.current = {
      resolve: (token: string) => {
        clearTimeout(timeoutId);
        resolve(token);
      },
      reject: (err: Error) => {
        clearTimeout(timeoutId);
        reject(err);
      },
    };
    webviewRef.current.postMessage(JSON.stringify({ type: "execute" }));
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

    return (
      <View style={{ width: 0, height: 0, overflow: "hidden" }}>
        <WebView
          ref={webviewRef}
          source={{ html, baseUrl: "https://hoshigo.app" }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          androidLayerType="software"
          style={{ width: 1, height: 1 }}
        />
      </View>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";