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
import { loginRevenueCat } from "../services/revenuecat";
import { useApp } from "./AppContexts";
import { initialProfile, useProfile } from "./ProfileContexts";

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
  // refetch は、サーバーに「いまのセッションは?」と、もう一度聞き直す関数。
  const { data: session, isPending, refetch } = authClient.useSession();
  const userId = session?.user.id ?? null;

  // RevenueCatに「この人です」と教える。userId が変わるたびに(ゲストでもGoogleでも)実行される
  useEffect(() => {
    if (isPending || !userId) return;
    loginRevenueCat(userId).catch((err) => {
      console.warn("RevenueCatのログインに失敗:", err);
    });
  }, [isPending, userId]);

  // effectの中から、最新のsegmentsを読むため
  const segmentsRef = useRef(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  });

  // Ref4兄弟
  // 最後にプロフィールを同期した userId。userId が変わったときだけ同期するための目印
  // (起動時・ゲストログイン・Googleログインのどれで変わっても、自動で同期される)
  const syncedUserIdRef = useRef<string | null>(null);
  // アプリを開いて、最初の1回か
  const isFirstRef = useRef(true);
  // ゲストログイン中の、二重実行ガード
  const signingInRef = useRef(false);
  // ゲストログインに失敗したら true。true の間は、自動でやり直さない(ブラウザが何度も開くのを防ぐ)
  const guestFailedRef = useRef(false);

  const clearUserState = () => {
    updateProfile(initialProfile);
  };

  // ゲストログイン失敗時の後始末。以後は自動でやり直さない
  const failGuest = (message: string, err?: unknown) => {
    console.error(message, err);
    guestFailedRef.current = true;
    clearUserState();
    setIsInitializing(false);
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
  //  ・ログインしていなければ、(本当にログアウトか確かめてから)ゲストログインする
  //  ・userId が変わったら、プロフィールを取って、ホームに行く(Googleログインのあとも、ここで拾う)
  useEffect(() => {
    // サーバーに確認している途中は、何もしない
    if (isPending) return;

    // ---- ログインしていない: ゲストログインする ----
    if (!userId) {
      // ゲストログイン中、または、前に失敗していたら、やり直さない
      if (signingInRef.current || guestFailedRef.current) return;
      signingInRef.current = true;
      syncedUserIdRef.current = null;
      const wasFirst = isFirstRef.current;

      const signInAsGuest = async () => {
        try {
          // 🛟 一瞬だけ null に見えた、という可能性があるので、
          // ゲストを作る前に、サーバーに「本当にセッションが無いか」を聞き直す。
          // (ここでゲストを作ると、有効なGoogleのcookieを上書きして失ってしまう)
          const { data: current } = await authClient.getSession({
            query: { disableCookieCache: true },
          });
          if (current?.user) {
            console.log(
              "🛟 一瞬nullに見えただけ。サーバーにはセッションがある",
              {
                userId: current.user.id,
                isAnonymous: current.user.isAnonymous ?? null,
              },
            );
            // 画面側の状態を、正しい内容に直す(直ると userId が変わり、このeffectがもう一度動く)
            void refetch();
            return;
          }

          // ログアウトなどのあとは、画面を「準備中」にして、ユーザーの表示を空にする
          if (!wasFirst) {
            setIsInitializing(true);
            clearUserState();
          }

          // 失敗したら例外 → 下の catch で後始末される
          const captchaToken = await getCaptchaToken();

          // 前の人のデータが残ってたりするので、起動時だけ消しとく
          // (ログインのあとに消すと、新しいログインの情報まで消えるかもしれないので、先に消す)
          if (wasFirst) await clearAllLocalData();

          const { data, error } = await authClient.signIn.anonymous({
            fetchOptions: { headers: { "x-captcha-response": captchaToken } },
          });
          if (error || !data) {
            failGuest("ゲストログイン失敗:", error);
          }
          // ログインできると、useSessionが更新されて、このeffectが、もう一度動く(下へ)
        } catch (err) {
          // CAPTCHAの失敗や、通信できないときなどに来る
          failGuest("ゲストログイン失敗(CAPTCHA・通信エラー):", err);
        } finally {
          signingInRef.current = false;
        }
      };

      void signInAsGuest();
      return;
    }

    // ---- ログインできている: userId が変わったときだけ、プロフィールを取って、ホームに行く ----
    guestFailedRef.current = false;
    // このuserIdで同期済みなら、何もしない
    if (syncedUserIdRef.current === userId) return;
    syncedUserIdRef.current = userId;
    const wasFirst = isFirstRef.current;
    isFirstRef.current = false;

    const afterSignedIn = async () => {
      try {
        const profile = await syncProfile();
        if (!profile) {
          clearUserState();
          return;
        }

        // 起動時は、すでにタブや開発用の画面にいれば、移動しない。
        // ログアウトやGoogleログインのあとは、必ずホームへ。
        const isInTabs = segmentsRef.current[0] === "(tabs)";
        const isDebug = segmentsRef.current[0] === "(debug)";
        if (!wasFirst || (!isInTabs && !isDebug)) {
          setTimeout(() => {
            router.replace({ pathname: "/HomeScreen" });
          }, 0);
        }
      } catch (err) {
        console.error("プロフィール同期に失敗:", err);
        clearUserState();
      } finally {
        // 何があっても「準備中」のままで固まらないようにする
        setIsInitializing(false);
      }
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
