/**
 * AuthGate.tsx
 * 認証チェック・プロフィール取得・メンテナンス確認・画面遷移を担当。
 * AppProviders の子として配置する。
 */

import { useApp } from "@/src/active/contexts/AppContexts";

import {
  handleAuthCallback,
  supabase,
} from "@/src/stable/services/supabase/supabase";
import { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "expo-router";
import React, { ReactNode, useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";
import { useProfile } from "../ProfileContexts";

// ─────────────────────────────────────────────
// 型・定数
// ─────────────────────────────────────────────

type LaunchReason = "normal" | "signup" | "recovery";

// ─────────────────────────────────────────────
// ヘルパー：起動理由の判定
// ─────────────────────────────────────────────

function detectReasonFromFragment(url: string): LaunchReason | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const type = params.get("type");
  const hasTokens = params.get("access_token") && params.get("refresh_token");

  if (!hasTokens) return null;
  if (type === "signup") return "signup";
  if (type === "recovery") return "recovery";
  return null;
}

async function detectLaunchReason(url?: string): Promise<LaunchReason> {
  // アプリが開いている状態でメールのリンクを踏んだ場合(見張り犬🐶)
  if (url) {
    const reason = detectReasonFromFragment(url);
    if (reason) return reason;
  }

  // Webブラウザ環境でメールのリンクを踏んだ場合
  if (Platform.OS === "web") {
    const reason = detectReasonFromFragment(window.location.href);
    if (reason) return reason;
  }

  // アプリが閉じている状態でメールのリンクを踏んだ場合
  const initialUrl = await Linking.getInitialURL();
  if (initialUrl) {
    const reason = detectReasonFromFragment(initialUrl);
    if (reason) return reason;
  }

  // 上のいずれでもない場合
  return "normal";
}

// ─────────────────────────────────────────────
// ヘルパー：セッションの確立
// ─────────────────────────────────────────────

async function establishSession(reason: LaunchReason, url?: string) {
  if (reason === "signup" || reason === "recovery") {
    const targetUrl =
      url ??
      (Platform.OS === "web"
        ? window.location.href
        : ((await Linking.getInitialURL()) ?? ""));

    // 🌟 handleAuthCallback に丸投げするだけでOK
    if (targetUrl) {
      const { data, error } = await handleAuthCallback(targetUrl);
      if (error) console.error("Session setup error:", error);
      if (data?.session) return data.session;
    }
  }

  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

// ─────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 今いる場所を最新の状態で覚えるためのメモ帳（ref）
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // ── Context ──
  const { setProfile, updateProfile } = useProfile();
  const { setMaintenance, setMaintenanceMessage } = useApp();

  // これらのsetter群はレンダーのたびに新しい参照になりうるのでrefに保存
  const settersRef = useRef({
    setProfile,
    updateProfile,
    setMaintenance,
    setMaintenanceMessage,
  });

  useEffect(() => {
    settersRef.current = {
      setProfile,
      updateProfile,
      setMaintenance,
      setMaintenanceMessage,
    };
  });

  // ── ユーザー関連stateを丸ごとリセットする ──
  const clearUserState = () => {
    const s = settersRef.current;
    s.setProfile({
      uid: null,
      email: null,
      username: null,
      iconIndex: 0,
      acquiredIcons: [0],
      games9: 0,
      games13: 0,
      points9: 0,
      points13: 0,
      groupIndex9: 0,
      groupIndex13: 0,
      allowBotMatch: true, // 未ログイン時のデフォルトはtrue
    });
  };

  // ── セッションからプロフィールを取得してContextに反映する ──
  // 戻り値: 取得できたprofile（存在しなければnull）
  const loadUserData = async (session: Session) => {
    const s = settersRef.current;

    // 基本情報（uid, email）をまず更新する
    s.updateProfile({
      uid: session.user.id,
      email: session.user.email ?? null,
    });

    // メンテナンス確認
    const { data: statusData, error: statusError } =
      await supabase.rpc("get_app_status");
    if (statusError) {
      console.error("❌ app_status fetch failed:", statusError);
    } else if (statusData?.[0]) {
      const status = statusData[0];
      console.log("✅ app_status fetched:", status);
      s.setMaintenance?.(status.maintenance);
      s.setMaintenanceMessage?.(status.message);
    }

    // プロフィール取得
    const { data: profile, error: profileError } =
      await supabase.rpc("get_my_profile");
    if (profileError) {
      console.error("fetch profile failed", profileError);
      return null;
    }
    if (!profile) {
      return null;
    }

    // DBから取得したデータでプロフィールを一括更新する
    s.updateProfile({
      username: profile.username,
      points9: profile.points_9,
      points13: profile.points_13,
      iconIndex: profile.icon_index,
      groupIndex9: profile.group_index_9,
      groupIndex13: profile.group_index_13,
      games9: profile.games_9,
      games13: profile.games_13,
      acquiredIcons: profile.acquired_icons,
      allowBotMatch: profile.allow_bot_match,
    });

    return profile;
  };

  useEffect(() => {
    const initialize = async (url?: string) => {
      const currentPath = pathnameRef.current;

      // 1. どこから来たか判定
      const reason: LaunchReason = await detectLaunchReason(url);
      console.log("🚀 Launch reason:", reason);

      // 2. セッション確立
      const session = await establishSession(reason, url);
      if (!session) {
        clearUserState();
        if (currentPath !== "/Login") {
          router.replace("/Login");
        }
        return;
      }

      // 3〜4. メンテナンス確認・プロフィール取得
      const profile = await loadUserData(session);
      if (!profile) {
        if (currentPath !== "/RegisterProfile") {
          router.replace("/RegisterProfile");
        }
        return;
      }

      // 5. 画面遷移
      const isInTabs = currentPath.startsWith("/(tabs)");
      if (!isInTabs) {
        router.replace("/Home");
      }
    };

    initialize();

    // 🐶 見張り犬（ディープリンク）
    const linkingSubscription = Linking.addEventListener("url", (event) => {
      console.log("📱 Deep link (runtime):", event.url);
      initialize(event.url);
    });

    // 🐱 見張り猫（認証状態の変化）
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🐱 Auth event:", event, "Has session:", !!session);

        const currentPath = pathnameRef.current;

        if (!session) {
          // ログアウト・セッション消失時
          if (currentPath !== "/Login") {
            clearUserState();
            router.replace("/Login");
          }
          return;
        }

        if (event === "SIGNED_IN") {
          // ログイン成功時：プロフィールを取り直してContextに反映
          loadUserData(session);
        }
      },
    );

    return () => {
      linkingSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
