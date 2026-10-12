import { supabase } from "@/src/services/supabase/supabase";

type ProfileData = {
  username: string;
  iconIndex: number;
  // 9
  wins9: number;
  losses9: number;
  draws9: number;
  rating9: number;
  giantKillingStreak9: number;
  // 13
  wins13: number;
  losses13: number;
  draws13: number;
  rating13: number;
  giantKillingStreak13: number;
  // 19
  wins19: number;
  losses19: number;
  draws19: number;
  rating19: number;
  giantKillingStreak19: number;
  // other
  allowBotMatch9: boolean;
  allowBotMatch13: boolean;
  allowBotMatch19: boolean;
  country: string | null;
};

type SessionUserData = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

type FetchProfileResult = {
  sessionUser: SessionUserData | null;
  profile: ProfileData | null;
  // newerRecords9: any[];
  // newerRecords13: any[];
  // newerRecords19: any[];
};

export const fetchProfileRPC = async (): Promise<FetchProfileResult | null> => {
  // afterId9?: number | null,
  // afterId13?: number | null,
  // afterId19?: number | null,
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_my_profile", {
    // p_after_id_9: afterId9 ?? null,
    // p_after_id_13: afterId13 ?? null,
    // p_after_id_19: afterId19 ?? null,
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
        iconIndex: rawProfile.icon_index ?? 0,
        // 9
        wins9: rawProfile.wins_9 ?? 0,
        losses9: rawProfile.losses_9 ?? 0,
        draws9: rawProfile.draws_9 ?? 0,
        rating9: rawProfile.rating_9 ?? 0,
        giantKillingStreak9: rawProfile.giant_killing_streak_9 ?? 0,
        // 13
        wins13: rawProfile.wins_13 ?? 0,
        losses13: rawProfile.losses_13 ?? 0,
        draws13: rawProfile.draws_13 ?? 0,
        rating13: rawProfile.rating_13 ?? 0,
        giantKillingStreak13: rawProfile.giant_killing_streak_13 ?? 0,
        // 19
        wins19: rawProfile.wins_19 ?? 0,
        losses19: rawProfile.losses_19 ?? 0,
        draws19: rawProfile.draws_19 ?? 0,
        rating19: rawProfile.rating_19 ?? 0,
        giantKillingStreak19: rawProfile.giant_killing_streak_19 ?? 0,
        // other
        allowBotMatch9: rawProfile.allow_bot_match9 ?? false,
        allowBotMatch13: rawProfile.allow_bot_match13 ?? false,
        allowBotMatch19: rawProfile.allow_bot_match19 ?? false,
        country: rawProfile.country ?? null,
      }
    : null;

  return {
    sessionUser,
    profile,
    // newerRecords9: data.newer_records_9 ?? [],
    // newerRecords13: data.newer_records_13 ?? [],
    // newerRecords19: data.newer_records_19 ?? [],
  };
};
