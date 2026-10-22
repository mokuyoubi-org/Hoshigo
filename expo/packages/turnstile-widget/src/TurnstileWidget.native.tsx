// TurnstileWidget.native.tsx
// ネイティブ(iOS/Android)版のTurnstile実装。
// hoshigo.app上の静的ページ(turnstile-bridge.html)を、
// expo-web-browser(Custom Tabs / SFSafariViewController、本物のブラウザエンジン)で開く。
// ブラウザでTurnstileチャレンジを実行し、
// カスタムスキーム(hoshigo://turnstile-callback)へのリダイレクトでトークンを受け取る。
// (このコンポーネントが呼ばれるのは匿名ログインのときだけで、隠れたWebViewでは
//  静かに合格できる見込みが無かったため、最初から本物のブラウザを開く)

import * as WebBrowser from "expo-web-browser";
import { forwardRef, useImperativeHandle, useRef } from "react";

export type TurnstileHandle = {
  getToken: () => Promise<string>;
};

type Props = {
  sitekey: string;
  lang: string;
  bgColor: string;
  textColor: string;
  spinnerColor: string;
  spinnerTrackColor: string;
};

const BRIDGE_URL = "https://hoshigo.app/turnstile-bridge.html";
const REDIRECT_URL = "hoshigo://turnstile-callback";
const BROWSER_TIMEOUT_MS = 60000;

// "#RRGGBB" → "RRGGBB"(URLに載せるため)
const stripHash = (color: string) => color.replace("#", "");

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  (
    { sitekey, lang, bgColor, textColor, spinnerColor, spinnerTrackColor },
    ref,
  ) => {
    // 同時に複数箇所からgetToken()が呼ばれても、後勝ちで前の呼び出し元が
    // 無反応(ハング)にならないよう、直列化する。ブラウザを二重に開かせない保険。
    const queueRef = useRef<Promise<unknown>>(Promise.resolve());

    const getTokenInternal = async (): Promise<string> => {
      const searchParams = new URLSearchParams({
        sitekey,
        lang,
        bgColor: stripHash(bgColor),
        textColor: stripHash(textColor),
        spinnerColor: stripHash(spinnerColor),
        spinnerTrackColor: stripHash(spinnerTrackColor),
      });

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Turnstile browser flow timed out")),
          BROWSER_TIMEOUT_MS,
        );
      });

      try {
        const result = await Promise.race([
          WebBrowser.openAuthSessionAsync(
            `${BRIDGE_URL}?${searchParams.toString()}`,
            REDIRECT_URL,
          ),
          timeout,
        ]);

        if (result.type !== "success") {
          throw new Error("Turnstile challenge cancelled");
        }

        const match = result.url.match(/[?&]token=([^&]+)/);
        if (!match) {
          throw new Error("Turnstile: redirect did not contain a token");
        }
        return decodeURIComponent(match[1]);
      } finally {
        // 終わったら、タイムアウトのタイマーを止める
        clearTimeout(timer);
      }
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
        return run;
      },
    }));

    // ブラウザに全て任せるので、このコンポーネント自体は何も描画しない
    return null;
  },
);

TurnstileWidget.displayName = "TurnstileWidget";
