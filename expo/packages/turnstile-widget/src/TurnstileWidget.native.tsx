// TurnstileWidget.native.tsx
// ネイティブ(iOS/Android)版のTurnstile実装。
// ✅2026/09/09 「インラインHTML + baseUrlで偽装したオリジン」を、
//   hoshigo.app上に本物の静的ページ(turnstile-bridge.html)をホスティングし、
//   WebViewはそれを本当にネットワーク越しに読み込む方式に変更した。
// ✅2026/09/09 ブラウザで直接開くと即座にトークンが取れるのに、
//   埋め込みWebView内だと「人間の確認」を要求された場合に限って
//   何をどう工夫しても完了しないことが判明。WebViewという入れ物自体が
//   Cloudflareから信頼度の低い環境として扱われていると判断し、
//   普段の静かな確認は引き続き隠れたWebViewで行い、
//   Cloudflareが人間の確認を求めてきた時だけ、
//   expo-web-browser(Custom Tabs / SFSafariViewController、
//   本物のブラウザエンジン)を一時的に開いて解決する方式に変更した。
// WebView内で見えないTurnstileチャレンジを実行し、
// postMessage経由でトークンをRN側に受け渡す。

import * as WebBrowser from "expo-web-browser";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
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

const BRIDGE_URL = "https://hoshigo.app/turnstile-bridge.html";
const REDIRECT_URL = "hoshigo://turnstile-callback";

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

    const bridgeUrl = `${BRIDGE_URL}?sitekey=${encodeURIComponent(
      sitekey
    )}&action=${encodeURIComponent(action)}`;

    // Cloudflareが人間の確認を求めてきた時、隠れたWebViewでは完了できないので、
    // 本物のブラウザ(Custom Tabs等)を一時的に開いて解決する。
    const resolveViaBrowser = async () => {
      const current = pendingRef.current;
      if (!current) return; // 既に他の経路で解決/失敗済み
      pendingRef.current = null; // 隠れたWebView側からの二重解決を防ぐ

      try {
        const authUrl = `${bridgeUrl}&redirect=1`;
        const result = await Promise.race([
          WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URL),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Turnstile browser flow timed out")),
              60000
            )
          ),
        ]);

        if (result.type === "success" && result.url) {
          const match = result.url.match(/[?&]token=([^&]+)/);
          const token = match ? decodeURIComponent(match[1]) : null;
          if (token) {
            current.resolve(token);
          } else {
            current.reject(
              new Error("Turnstile: redirect did not contain a token")
            );
          }
        } else {
          current.reject(new Error("Turnstile challenge cancelled"));
        }
      } catch (e) {
        current.reject(
          e instanceof Error ? e : new Error("Turnstile browser flow failed")
        );
      }
    };

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
        } else if (data.type === "interactive" && data.value) {
          resolveViaBrowser();
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
        // (ブラウザ経由の解決に移った場合は、resolveViaBrowser内でpendingRefを
        //  nullにしているので、この保険は発火しない)
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
                      new Error(
                        "Turnstile widget did not become ready in time"
                      )
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
          source={{ uri: bridgeUrl }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          androidLayerType="software"
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          mixedContentMode="always"
          style={{ width: 1, height: 1 }}
        />
      </View>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";