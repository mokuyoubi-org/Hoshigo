// TurnstileWidget.native.tsx
// ネイティブ(iOS/Android)版のTurnstile実装。
// ✅2026/09/09 hoshigo.app上の静的ページ(turnstile-bridge.html)を
//   WebView経由で読み込む方式から、隠れたWebViewの分岐を撤廃し、
//   最初から expo-web-browser(Custom Tabs / SFSafariViewController、
//   本物のブラウザエンジン)を開く方式に変更した。
//   理由: このコンポーネントが呼ばれるのは anonymous_signin と
//   メールOTP用のactionのみで、どちらも「その場限りの真っ新な
//   リクエスト」であり、既存セッションのCookieに乗っかるような
//   ケースが無いため、隠れたWebViewが静かに合格する見込みが
//   実質無かった(=毎回ブラウザに飛んでいた)。
// 本物のブラウザでTurnstileチャレンジを実行し、
// カスタムスキームへのリダイレクトでトークンを受け取る。

import * as WebBrowser from "expo-web-browser";
import { forwardRef, useImperativeHandle, useRef } from "react";

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
    // 同時に複数箇所からgetToken()が呼ばれても、後勝ちで前の呼び出し元が
    // 無反応(ハング)にならないよう、直列化する(KataGoEngineContextの
    // isAnalyzingRef と同じ考え方)。ブラウザを二重に開かせない保険。
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());

    const getTokenInternal = (): Promise<string> => {
      return new Promise<string>(async (resolve, reject) => {
        const bridgeUrl = `${BRIDGE_URL}?sitekey=${encodeURIComponent(
          sitekey,
        )}&action=${encodeURIComponent(action)}`;

        try {
          const result = await Promise.race([
            WebBrowser.openAuthSessionAsync(bridgeUrl, REDIRECT_URL),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Turnstile browser flow timed out")),
                60000,
              ),
            ),
          ]);

          if (result.type === "success" && result.url) {
            const match = result.url.match(/[?&]token=([^&]+)/);
            const token = match ? decodeURIComponent(match[1]) : null;
            if (token) {
              resolve(token);
            } else {
              reject(new Error("Turnstile: redirect did not contain a token"));
            }
          } else {
            reject(new Error("Turnstile challenge cancelled"));
          }
        } catch (e) {
          reject(
            e instanceof Error ? e : new Error("Turnstile browser flow failed"),
          );
        }
      });
    };

    useImperativeHandle(ref, () => ({
      getToken: () => {
        const run = queueRef.current
          .catch(() => {
            // 前の呼び出しが失敗していても、キューは止めない
          })
          .then(() => getTokenInternal());

        // 次の呼び出しは、これが終わってから(成功/失敗問わず)始まる
        queueRef.current = run.catch(() => {});
        return run as Promise<string>;
      },
    }));

    // ブラウザに全て任せるので、このコンポーネント自体は何も描画しない
    return null;
  },
);

TurnstileWidget.displayName = "TurnstileWidget";
