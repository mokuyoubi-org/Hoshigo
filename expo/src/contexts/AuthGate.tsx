// AuthGate.tsx

import { OTA_VERSION } from "@/ota-version";
import { useProfileSync } from "@/src/hooks/rpc/useProfileSync";
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

  // ログイン状態(Better Auth)。変わるたびに、自動で、画面が更新される。
  // data が null なら、ログインしていない(ビジター)。isPending は、サーバーに確認している途中。
  // refetch は、サーバーに「いまのセッションは?」と、もう一度聞き直す関数。
  const { data: session, isPending, refetch } = authClient.useSession();
  const userId = session?.user.id ?? null;

  // RevenueCatに「この人です」と教える。userId が変わるたびに(匿名でもGoogleでも)実行される
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

  // Ref2兄弟
  // 最後にプロフィールを同期した userId。userId が変わったときだけ同期するための目印
  // (起動時・匿名ログイン・Googleログインのどれで変わっても、自動で同期される)
  const syncedUserIdRef = useRef<string | null>(null);
  // アプリを開いて、最初の1回か(ログインできている状態を見るまでは true のまま)
  const isFirstRef = useRef(true);

  const clearUserState = () => {
    updateProfile(initialProfile);
  };

  // ホームへ移動する(画面の切り替え中に呼ぶと失敗することがあるので、1拍おく)
  const goHome = () => {
    setTimeout(() => {
      router.replace({ pathname: "/HomeScreen" });
    }, 0);
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
  //  ・ログインしていなければ(ビジター)、何も作らない。匿名は、対局ボタンを押した時に作られる
  //  ・userId が変わったら、プロフィールを取って、ホームに行く(Googleログインのあとも、ここで拾う)
  useEffect(() => {
    // サーバーに確認している途中は、何もしない
    if (isPending) return;

    // ---- ログインしていない(ビジター) ----
    if (!userId) {
      syncedUserIdRef.current = null;

      // 起動時: 何も作らず、通信もしない。
      // すでにタブや開発用の画面にいれば、移動しない。
      if (isFirstRef.current) {
        clearUserState();
        const isInTabs = segmentsRef.current[0] === "(tabs)";
        const isDebug = segmentsRef.current[0] === "(debug)";
        if (!isInTabs && !isDebug) goHome();
        setIsInitializing(false);
        return;
      }

      // ログインできていた人が null になった: ログアウトか、一瞬nullに見えただけか
      const checkLogout = async () => {
        // 🛟 一瞬だけ null に見えた、という可能性があるので、
        // サーバーに「本当にセッションが無いか」を聞き直す。
        const { data: current, error } = await authClient.getSession({
          query: { disableCookieCache: true },
        });
        if (error) {
          console.error("セッションの確認に失敗:", error);
          return;
        }
        if (current?.user) {
          console.log("🛟 一瞬nullに見えただけ。サーバーにはセッションがある", {
            userId: current.user.id,
          });
          // 画面側の状態を、正しい内容に直す(直ると userId が変わり、このeffectがもう一度動く)
          void refetch();
          return;
        }
        // 本当にログアウトした。ビジターに戻して、ホームへ
        clearUserState();
        goHome();
      };

      void checkLogout();
      return;
    }

    // ---- ログインできている: userId が変わったときだけ、プロフィールを取って、ホームに行く ----
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
        if (!wasFirst || (!isInTabs && !isDebug)) goHome();
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

  // ここは<View>にしてはいけない
  return <>{children}</>;
};
