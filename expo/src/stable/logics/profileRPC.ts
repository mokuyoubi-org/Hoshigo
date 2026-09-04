// @/src/stable/services/api/profileRPC.ts

import { supabase } from "@/src/stable/services/supabase/supabase";

export type ProfileData = {
  username: string;
  rating9: number;
  rating13: number;
  iconIndex: number;
  wins9: number;
  losses9: number;
  draws9: number;
  wins13: number;
  losses13: number;
  draws13: number;
  acquiredIcons: number[];
  allowBotMatch: boolean;
};

export type AppStatusData = {
  maintenance: boolean;
  message: string | null;
  version: string | null;
};

export type SessionUserData = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

export type FetchProfileResult = {
  sessionUser: SessionUserData | null;
  appStatus: AppStatusData | null;
  profile: ProfileData | null;
};

/**
 * サーバーからプロフィールとアプリ状態を取得するだけの純粋なAPI関数
 */
export async function fetchProfileRPC(): Promise<FetchProfileResult | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_my_profile");

  if (error || !data) {
    console.error("fetch profile failed:", error);
    return null;
  }

  // 1. セッション情報
  const sessionUser: SessionUserData = {
    id: session.user.id,
    email: session.user.email ?? null,
    isAnonymous: session.user.is_anonymous ?? false,
  };

  // 2. メンテ情報
  const appStatus: AppStatusData | null = data.app_status
    ? {
        maintenance: data.app_status.maintenance ?? false,
        message: data.app_status.message ?? null,
        version: data.app_status.version ?? null,
      }
    : null;

  // 3. プロフィール情報
  const rawProfile = data.profile;
  const profile: ProfileData | null = rawProfile
    ? {
        username: rawProfile.username ?? "",
        rating9: rawProfile.rating_9 ?? 0,
        rating13: rawProfile.rating_13 ?? 0,
        iconIndex: rawProfile.icon_index ?? 0,
        wins9: rawProfile.wins_9 ?? 0,
        losses9: rawProfile.losses_9 ?? 0,
        draws9: rawProfile.draws_9 ?? 0,
        wins13: rawProfile.wins_13 ?? 0,
        losses13: rawProfile.losses_13 ?? 0,
        draws13: rawProfile.draws_13 ?? 0,
        acquiredIcons: rawProfile.acquired_icons ?? [],
        allowBotMatch: rawProfile.allow_bot_match ?? false,
      }
    : null;

  return { sessionUser, appStatus, profile };
}
