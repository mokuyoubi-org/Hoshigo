// TurnstileWidget.native.tsx
// ネイティブ(iOS/Android)版のTurnstile実装。
// ✅2026/09/09 「インラインHTML + baseUrlで偽装したオリジン」だと、
//   Cloudflare側が非標準環境とみなすらしく300030エラーの無限ループに
//   陥ることが判明したため、hoshigo.app上に本物の静的ページ
//   (turnstile-bridge.html)をホスティングし、WebViewはそれを
//   本当にネットワーク越しに読み込む方式に変更した。
// ✅2026/09/09 普段は1px四方の見えない場所にWebViewを置いているため、
//   Cloudflareがまれに要求する「人間によるチェック(interactive)」が
//   物理的に押せず、永遠にタイムアウトする問題が発覚。
//   before/after-interactive-callbackを使い、必要な時だけ画面中央に
//   モーダル風に表示し、終わったら元の見えない状態に戻すようにした。
// ✅2026/09/09 WebView自体のサイズ(style)をisInteractiveで切り替えると、
//   Cloudflare側の描画がリサイズに追従できず真っ白になる不具合が発覚。
//   WebViewのサイズは常に300x300で固定し、包む側のViewの位置・透明度
//   だけを切り替える方式に変更した(画面外に追いやる/中央に表示する)。
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
    const webviewRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<{
      resolve: (token: string) => void;
      reject: (err: Error) => void;
    } | null>(null);

    // Cloudflareが人間によるチェックを要求してきた時だけtrueにする。
    // trueの間だけ、画面中央にモーダル風にWebViewを表示する。
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

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "ready") {
          readyRef.current = true;
          readyResolveRef.current?.();
        } else if (data.type === "token") {
          setIsInteractive(false);
          pendingRef.current?.resolve(data.token);
          pendingRef.current = null;
        } else if (data.type === "error") {
          console.error("Turnstile error code:", data.code);
          setIsInteractive(false);
          pendingRef.current?.reject(new Error("Turnstile challenge failed"));
          pendingRef.current = null;
        } else if (data.type === "interactive") {
          setIsInteractive(Boolean(data.value));
        } else if (data.type === "debug") {
          console.log("Turnstile debug:", data.message);
        }
      } catch (e) {
        console.error("Turnstile message parse error:", e);
      }
    };

    // ユーザーがモーダルのキャンセルを押した場合の安全弁。
    // これが無いと、何らかの理由でチェックが完了できなかった時、
    // ユーザーが永遠にモーダルに閉じ込められてしまう。
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
        // これが無いと、pendingRefが永遠にresolve/rejectされずPromiseがハングする。
        const timeoutId = setTimeout(() => {
          if (pendingRef.current) {
            pendingRef.current = null;
            setIsInteractive(false);
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
      <View
        style={isInteractive ? styles.visibleWrapper : styles.hiddenWrapper}
        pointerEvents={isInteractive ? "auto" : "none"}
      >
        <View style={styles.modalCard}>
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
            style={styles.webview}
            onLoadStart={() => console.log("Turnstile WebView: onLoadStart")}
            onLoad={() => console.log("Turnstile WebView: onLoad成功")}
            onError={(e) =>
              console.error("Turnstile WebView onError:", e.nativeEvent)
            }
          />
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>cancel1</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

TurnstileWidget.displayName = "TurnstileWidget";

const styles = StyleSheet.create({
  hiddenWrapper: {
    position: "absolute",
    top: -1000,
    left: -1000,
    width: 320,
    height: 332,
    opacity: 0,
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
