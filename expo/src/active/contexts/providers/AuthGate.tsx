// ✅acive
/**
 *
 * AuthGate.tsx
 * 認証チェック・プロフィール取得・メンテナンス確認・画面遷移を担当。
 * AppProviders の子として配置する。
 *
 * 設計方針:
 * 「サインインする」きっかけは全部このアプリ自身のコードが作っている
 * (匿名ログイン、メール紐付け、アカウント統合など)。だから、それぞれの
 * 呼び出し元が成功後に自分でプロフィールを取り直せば十分。
 * ここの見張り猫(onAuthStateChange)は、本当に「外部要因でセッションが
 * 消えた」時の再匿名化だけを担当する。
 */

import { useApp } from "@/src/active/contexts/AppContexts";
import {
  setMaintenanceHandler,
  supabase,
} from "@/src/stable/services/supabase/supabase";
import { useRouter, useSegments } from "expo-router";
import React, { ReactNode, useEffect, useRef } from "react";
import { useProfileSync } from "../../hooks/others/useProfileSync";
import { useProfile } from "../ProfileContexts";

export function AuthGate({ children }: { children: ReactNode }) {
  // フック・コンテキストの取得
  const router = useRouter();
  const segments = useSegments();
  const { updateProfile } = useProfile();
  const { setMaintenance, setMaintenanceMessage, setIsInitializing } = useApp();
  const { syncProfile } = useProfileSync();

  // 最新の値を非同期処理内で安全に参照するための ref
  const segmentsRef = useRef(segments);
  const settersRef = useRef({
    updateProfile,
    setMaintenance,
    setMaintenanceMessage,
    setIsInitializing,
  });

  // ユーザー状態を初期値（未ログイン/初期状態）にクリアする関数
  const clearUserState = () => {
    const s = settersRef.current;
    s.updateProfile({
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

  // メンテナンス状態とユーザープロフィールの読み込み関数
  const loadUserData = async () => {
    // 🐱 これ1行で「セッション」「メンテ判定」「プロフィール更新（自動作成含む）」が全部完了だ
    const profile = await syncProfile();

    return profile;
  };

  // アプリ起動時の初期化処理（認証・データ取得・初期画面への遷移）
  const initialize = async () => {
    const currentSegments = segmentsRef.current;

    // 1. ログインする（できければ匿名ログインする）
    const { data } = await supabase.auth.getSession();
    let session = data.session ?? null;

    if (!session) {
      const { data: anonData, error } = await supabase.auth.signInAnonymously();
      if (error || !anonData.session) {
        console.error("匿名ログイン失敗:", error);
        clearUserState();
        settersRef.current.setIsInitializing(false);
        return;
      }
      session = anonData.session;
    }

    // 2. メンテチェック、プロフィール取得（未作成ならDB側で勝手に作られる）
    const profile = await loadUserData();
    if (!profile) {
      clearUserState();
      settersRef.current.setIsInitializing(false);
      return;
    }

    // 3. 画面遷移（segments[0]が"(tabs)"かどうかで正しく判定）
    const isInTabs = currentSegments[0] === "(tabs)";
    const isDebug = currentSegments[0] === "(debug)"; // 👈 デバッグ用ルートか判定
    if (!isInTabs && !isDebug) {
      router.replace("/(tabs)/HomeScreen");
    }

    settersRef.current.setIsInitializing(false);
  };

  // 現在の画面セグメント情報（URLパス）を ref に同期
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // 各種 Context の setter 関数を ref に同期（毎レンダリング時）
  useEffect(() => {
    settersRef.current = {
      updateProfile,
      setMaintenance,
      setMaintenanceMessage,
      setIsInitializing,
    };
  });

  // 初回マウント時の初期化実行 ＆ 認証状態の監視設定（セッション消失時の再匿名化）
  useEffect(() => {
    // 🐱 RPC実行時に MAINTENANCE_MODE エラーが出たら自動でContextをメンテ状態にする仕掛けをセット！
    setMaintenanceHandler((message) => {
      setMaintenance(true);
      setMaintenanceMessage(message);
    });

    initialize();

    // 🐱 見張り猫: 「外部要因でセッションが消えた」時の再匿名化だけを担当する。
    // サインイン成功(SIGNED_IN)への反応はここでは一切行わない。
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🐱 Auth event:", event, "Has session:", !!session);

        if (session) return;

        settersRef.current.setIsInitializing(true);
        clearUserState();

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.session) {
          console.error("再匿名化失敗:", error);
          settersRef.current.setIsInitializing(false);
          return;
        }

        const profile = await loadUserData();
        if (!profile) {
          console.error("再匿名化後のプロフィール取得に失敗");
          settersRef.current.setIsInitializing(false);
          return;
        }

        router.replace("/(tabs)/HomeScreen");
        settersRef.current.setIsInitializing(false);
      },
    );
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
