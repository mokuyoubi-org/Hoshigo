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

type SessionUserData = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

type FetchProfileResult = {
  sessionUser: SessionUserData | null;
  profile: ProfileData | null;
  newerRecords9: any[];
  newerRecords13: any[];
};

export async function fetchProfileRPC(
  afterId9?: number | null,
  afterId13?: number | null,
): Promise<FetchProfileResult | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_my_profile", {
    p_after_id_9: afterId9 ?? null,
    p_after_id_13: afterId13 ?? null,
  });

  if (error || !data) {
    console.error("fetch profile failed:", error);
    return null;
  }

  const sessionUser: SessionUserData = {
    id: session.user.id,
    email: session.user.email ?? null,
    isAnonymous: session.user.is_anonymous ?? false,
  };

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

  return {
    sessionUser,
    profile,
    newerRecords9: data.newer_records_9 ?? [],
    newerRecords13: data.newer_records_13 ?? [],
  };
}
