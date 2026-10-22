// turnstile-callback.tsx
// hoshigo://turnstile-callback を受け止めるだけの画面(「Unmatched Route」を出さないため)。
// トークンは openAuthSessionAsync の戻り値で受け取り済みなので、ここでは元の画面に戻すだけ。

import { router } from "expo-router";
import { useEffect } from "react";

const TurnstileCallback = () => {
  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/" });
    }
  }, []);

  return null;
};

export default TurnstileCallback;
