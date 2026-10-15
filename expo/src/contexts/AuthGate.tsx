// AuthGate.tsx

import { OTA_VERSION } from "@/ota-version";
import { useColors } from "@/src/hooks/common/useTheme";
import { useProfileSync } from "@/src/hooks/rpc/useProfileSync";
import { useLang } from "@/src/i18n/LangProvider";
import { clearAllLocalData } from "@/src/logics/storage/cleanUp";
import {
  setMaintenanceHandler,
  setUpdateNeededHandler,
} from "@/src/services/api/api";
import { authClient } from "@/src/services/auth/auth-client";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useRouter, useSegments } from "expo-router";
import * as Updates from "expo-updates";
import { ReactNode, useEffect, useRef } from "react";
import { TurnstileHandle, TurnstileWidget } from "turnstile-widget";
import { useApp } from "./AppContexts";
import { useProfile } from "./ProfileContexts";

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const { updateProfile } = useProfile();
  const {
    setMaintenance,
    setMaintenanceMessage,
    setIsInitializing,
    setUpdateReason,
  } = useApp();
  const { syncProfile } = useProfileSync();
  const turnstileRef = useRef<TurnstileHandle>(null);
  const { lang } = useLang();
  const colors = useColors();

  // ログイン状態(Better Auth)。変わるたびに、自動で、画面が更新される。
  // data が null なら、ログインしていない。isPending は、サーバーに確認している途中。
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id ?? null;

  // effectの中から、最新のsegmentsを読むため
  const segmentsRef = useRef(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  });

  // ログインできたら、プロフィールを取って、ホームに行く必要があるか(起動時と、ゲストログインし直したあと)
  const needsSyncRef = useRef(true);
  // アプリを開いて、最初の1回か
  const isFirstRef = useRef(true);
  // ゲストログイン中の、二重実行ガード
  const signingInRef = useRef(false);
  // ゲストログインに失敗したら true。true の間は、自動でやり直さない(ブラウザが何度も開くのを防ぐ)
  const guestFailedRef = useRef(false);

  const clearUserState = () => {
    updateProfile({
      uid: null,
      email: null,
      username: null,
      iconIndex: 0,
      // 9
      wins9: 0,
      losses9: 0,
      draws9: 0,
      rating9: 0,
      giantKillingStreak9: 0,
      // 13
      wins13: 0,
      losses13: 0,
      draws13: 0,
      rating13: 0,
      giantKillingStreak13: 0,
      // 19
      wins19: 0,
      losses19: 0,
      draws19: 0,
      rating19: 0,
      giantKillingStreak19: 0,
      // others
      allowBotMatch9: true,
      allowBotMatch13: true,
      allowBotMatch19: true,
      isAnonymous: true,
      country: null,
    });
  };

  // Turnstileトークンを取得する。失敗したら例外を投げる(厳格モード:
  // トークンが無いまま匿名ログインさせることは絶対にしない)。
  const getCaptchaToken = async (): Promise<string> => {
    const token = await turnstileRef.current?.getToken();
    if (!token) {
      throw new Error("Turnstileトークンを取得できませんでした");
    }
    return token;
  };

  // ①ビルド情報のログ + ②メンテナンス/バージョン不足の仕込み(最初の1回だけ)。
  useEffect(() => {
    console.log("🔎 実行中のビルド情報:", {
      runtimeVersion: Updates.runtimeVersion, // app.config.tsからruntimeVersion: を読み込んでいるだけ
      nativeApplicationVersion: Application.nativeApplicationVersion, // アプリ自体の実際のバージョンを読んでいる
      expoConfigVersion: Constants.expoConfig?.version, // app.config.tsからversion: を読み込んでいるだけ
      otaVersion: OTA_VERSION,
    });

    // RPCを呼んだ時にメンテ中だった時にメッセージを表示できる設定を、あらかじめ仕込んでおく
    // 詳細はapi.tsを参照
    setMaintenanceHandler((message) => {
      setMaintenance(true);
      setMaintenanceMessage(message);
    });

    // RPCを呼んだ時にバージョン不足だった時にモーダルを出せる設定を、あらかじめ仕込んでおく
    // 詳細はapi.tsを参照(メンテナンスと全く同じ仕組み)
    setUpdateNeededHandler((reason) => {
      setUpdateReason(reason);
    });
  }, []);

  // ③ログイン状態の見張り。
  //  ・ログインしていなければ、ゲストログインする(起動時、ログアウト、アカウント削除のあと)
  //  ・ログインできたら、プロフィールを取って、ホームに行く(必要なときだけ)
  
  useEffect(() => {
    // サーバーに確認している途中は、何もしない
    if (isPending) return;

    // ---- ログインしていない: ゲストログインする ----
    if (!userId) {
      // ゲストログイン中、または、前に失敗していたら、やり直さない
      if (signingInRef.current || guestFailedRef.current) return;
      signingInRef.current = true;
      needsSyncRef.current = true;
      const wasFirst = isFirstRef.current;

      const signInAsGuest = async () => {
        try {
          // ログアウトなどのあとは、画面を「準備中」にして、ユーザーの表示を空にする
          if (!wasFirst) {
            setIsInitializing(true);
            clearUserState();
          }

          let captchaToken: string;
          try {
            captchaToken = await getCaptchaToken();
          } catch (err) {
            console.error("ゲストログイン失敗(CAPTCHA)だよ:", err);
            guestFailedRef.current = true;
            clearUserState();
            setIsInitializing(false);
            return;
          }

          // 前の人のデータが残ってたりするので、起動時だけ消しとく
          // (ログインのあとに消すと、新しいログインの情報まで消えるかもしれないので、先に消す)
          if (wasFirst) await clearAllLocalData();

          const { data, error } = await authClient.signIn.anonymous({
            fetchOptions: { headers: { "x-captcha-response": captchaToken } },
          });
          if (error || !data) {
            console.error("ゲストログイン失敗:", error);
            guestFailedRef.current = true;
            clearUserState();
            setIsInitializing(false);
            return;
          }
          // ログインできると、useSessionが更新されて、このeffectが、もう一度動く(下の②へ)
        } catch (err) {
          // 通信できないときなどは、signIn が例外を投げることがある
          console.error("ゲストログイン失敗(通信エラー)だよ:", err);
          guestFailedRef.current = true;
          clearUserState();
          setIsInitializing(false);
        } finally {
          signingInRef.current = false;
        }
      };

      void signInAsGuest();
      return;
    }

    // ---- ログインできている: プロフィールを取って、ホームに行く(必要なときだけ) ----
    // (メールでログインしたときは、ログインのモーダルが自分でやるので、ここでは何もしない)
    guestFailedRef.current = false;
    if (!needsSyncRef.current) return;
    needsSyncRef.current = false;
    const wasFirst = isFirstRef.current;
    isFirstRef.current = false;

    const afterSignedIn = async () => {
      const profile = await syncProfile();
      if (!profile) {
        clearUserState();
        setIsInitializing(false);
        return;
      }

      // 起動時は、すでにタブや開発用の画面にいれば、移動しない。
      // ログアウトなどのあとは、必ずホームへ。
      const isInTabs = segmentsRef.current[0] === "(tabs)";
      const isDebug = segmentsRef.current[0] === "(debug)";
      if (!wasFirst || (!isInTabs && !isDebug)) {
        setTimeout(() => {
          router.replace({
            pathname: "/HomeScreen",
          });
        }, 0);
      }

      setIsInitializing(false);
    };

    void afterSignedIn();
  }, [isPending, userId]);

  return (
    // ここは<View>にしてはいけない
    <>
      <TurnstileWidget
        ref={turnstileRef}
        sitekey={process.env.EXPO_PUBLIC_TURNSTILE_SITEKEY!}
        bgColor={colors.background}
        textColor={colors.text}
        spinnerColor={colors.primary}
        spinnerTrackColor={colors.backgroundStrong}
        lang={lang}
      />
      {children}
    </>
  );
};
