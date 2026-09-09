// TurnstileWidget.native.tsx
// ネイティブ(iOS/Android)版のTurnstile実装。
// ✅2026/09/09 「インラインHTML + baseUrlで偽装したオリジン」を、
//   hoshigo.app上に本物の静的ページ(turnstile-bridge.html)をホスティングし、
//   WebViewはそれを本当にネットワーク越しに読み込む方式に変更した。
// ✅2026/09/09 「一度でも隠された(サイズ0/画面外/opacity0)状態を経験した
//   WebViewは、後から見せても中の描画が復活しない」というAndroid WebView
//   特有の癖が判明。普段のログイン用WebView(常に隠れたまま)とは別に、
//   Cloudflareが人間の確認を求めてきた時だけ、生まれた時から画面上に
//   存在する専用の新しいWebViewを都度生成する方式に変更した。
// WebView内で見えないTurnstileチャレンジを実行し、
// postMessage経由でトークンをRN側に受け渡す。

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  ({ sitekey, action = "anonymous_signin" }, ref) => {
    // 普段のログイン用(常に隠れたまま)のWebView
    const webviewRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<{
      resolve: (token: string) => void;
      reject: (err: Error) => void;
    } | null>(null);

    // Cloudflareが人間によるチェックを要求してきた時だけtrueにする。
    // trueの間だけ、専用の新しいWebViewをモーダルとして生成する。
    const [isInteractive, setIsInteractive] = useState(false);

    // WebView側の準備が整うまでgetToken()を待たせるためのPromise
    const readyResolveRef = useRef<(() => void) | null>(null);
    const readyPromiseRef = useRef<Promise<void>>(
      new Promise((resolve) => {
        readyResolveRef.current = resolve;
      }),
    );

    const bridgeUrl = `${BRIDGE_URL}?sitekey=${encodeURIComponent(
      sitekey,
    )}&action=${encodeURIComponent(action)}`;

    // 普段の(隠れた)WebViewからのメッセージ
    const handleHiddenMessage = (event: WebViewMessageEvent) => {
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
          setIsInteractive(true);
        } else if (data.type === "debug") {
          console.log("Turnstile debug(hidden):", data.message);
        }
      } catch (e) {
        console.error("Turnstile message parse error:", e);
      }
    };

    // インタラクション専用の、生まれた時から画面上に見えているWebViewからのメッセージ
    const handleVisibleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "token") {
          setIsInteractive(false);
          pendingRef.current?.resolve(data.token);
          pendingRef.current = null;
        } else if (data.type === "error") {
          console.error("Turnstile error code(visible):", data.code);
          setIsInteractive(false);
          pendingRef.current?.reject(new Error("Turnstile challenge failed"));
          pendingRef.current = null;
        } else if (data.type === "debug") {
          console.log("Turnstile debug(visible):", data.message);
        }
      } catch (e) {
        console.error("Turnstile message parse error(visible):", e);
      }
    };

    // ユーザーがモーダルのキャンセルを押した場合の安全弁。
    const handleCancel = () => {
      setIsInteractive(false);
      if (pendingRef.current) {
        pendingRef.current.reject(new Error("Turnstile challenge cancelled"));
        pendingRef.current = null;
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
        const timeoutId = setTimeout(() => {
          if (pendingRef.current) {
            pendingRef.current = null;
            setIsInteractive(false);
            reject(new Error("Turnstile token request timed out"));
          }
        }, 30000); // モーダル表示・人間の操作を待つ時間も含むため30秒に延長

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
                        "Turnstile widget did not become ready in time",
                      ),
                    ),
                  10000,
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

    return (
      <>
        {/* 普段のログイン用。常に隠れたまま */}
        <View style={styles.hiddenWrapper}>
          <WebView
            ref={webviewRef}
            source={{ uri: bridgeUrl }}
            onMessage={handleHiddenMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            androidLayerType="software"
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            mixedContentMode="always"
            style={styles.webview}
          />
        </View>

        {/* インタラクションが必要な時だけ、真っ新な状態で生成 */}
        {isInteractive ? (
          <View style={styles.visibleWrapper} pointerEvents="auto">
            <View style={styles.modalCard}>
              <WebView
                source={{ uri: `${bridgeUrl}&auto=1` }}
                onMessage={handleVisibleMessage}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={["*"]}
                androidLayerType="software"
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                mixedContentMode="always"
                style={styles.webview}
              />
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </>
    );
  },
);

TurnstileWidget.displayName = "TurnstileWidget";

const styles = StyleSheet.create({
  hiddenWrapper: {
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  visibleWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 9999,
  },
  modalCard: {
    width: 320,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  webview: {
    width: 300,
    height: 300,
    backgroundColor: "white",
  },
  cancelButton: {
    marginTop: 12,
    padding: 8,
  },
  cancelText: {
    color: "#888",
    fontSize: 14,
  },
});
