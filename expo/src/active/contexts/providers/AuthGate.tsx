// ✅2026/08/31コメント入れた。メンテナンス仕込み系、見張り猫は完全には理解していない。
// AuthGate.tsx

import { useApp } from "@/src/active/contexts/AppContexts";
import {
  setMaintenanceHandler,
  supabase,
} from "@/src/stable/services/supabase/supabase";
import { useRouter, useSegments } from "expo-router";
import React, { ReactNode, useEffect } from "react";
import { useProfileSync } from "../../hooks/others/useProfileSync";
import { useProfile } from "../ProfileContexts";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { updateProfile } = useProfile();
  const { setMaintenance, setMaintenanceMessage, setIsInitializing } = useApp();
  const { syncProfile } = useProfileSync();

  const clearUserState = () => {
    updateProfile({
      uid: null,
      email: null,
      username: null,
      iconIndex: 0,
      acquiredIcons: [0],
      games9: 0,
      games13: 0,
      points9: 0,
      points13: 0,
      allowBotMatch: true,
      isAnonymous: true,
    });
  };

  // ①メンテナンス仕込み + ②initialize + ③見張り猫設置。
  useEffect(() => {
    // RPCを呼んだ時にメンテ中だった時にメッセージを表示できる設定を、あらかじめ仕込んでおく
    // 詳細はsupabase.tsを参照
    setMaintenanceHandler((message) => {
      setMaintenance(true);
      setMaintenanceMessage(message);
    });

    // 初期化処理。①ログイン(匿名含む) + ②syncProfile + ③セグメント分岐による遷移
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      let session = data.session ?? null;

      if (!session) {
        const { data: anonData, error } =
          await supabase.auth.signInAnonymously();
        if (error || !anonData.session) {
          console.error("匿名ログイン失敗:", error);
          clearUserState();
          setIsInitializing(false);
          return;
        }
        session = anonData.session;
      }

      const profile = await syncProfile();
      if (!profile) {
        clearUserState();
        setIsInitializing(false);
        return;
      }

      const isInTabs = segments[0] === "(tabs)";
      const isDebug = segments[0] === "(debug)";
      if (!isInTabs && !isDebug) {
        setTimeout(() => {
          router.replace({
            pathname: "/HomeScreen",
          });
        }, 0);
      }

      setIsInitializing(false);
    };

    console.log("initialize"); // devの時は2回呼ばれちゃうみたい...。
    initialize();

    // 見張り猫の設置。セッションが切れないかを見張り、切れたら、匿名ログイン。
    // セッション切れは、ログアウトやデリート含む。
    // 詳細は、useSettingsScreen.tsxのonLogout(), handleConfirmDelete()を参照。
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🐱 Auth event:", event, "Has session:", !!session);
        if (session) return;

        setIsInitializing(true);
        clearUserState();

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.session) {
          console.error("再匿名化失敗:", error);
          setIsInitializing(false);
          return;
        }

        const profile = await syncProfile();
        if (!profile) {
          console.error("再匿名化後のプロフィール取得に失敗");
          setIsInitializing(false);
          return;
        }

        setTimeout(() => {
          router.replace({
            pathname: "/HomeScreen",
          });
        }, 0);
        setIsInitializing(false);
      },
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []); // 初回マウント時のみ実行

  return <>{children}</>;
}
