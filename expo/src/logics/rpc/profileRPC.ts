// profileRPC.ts

import { api } from "@/src/services/api/api";
import { authClient } from "@/src/services/auth/auth-client";

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
};

export const fetchProfileRPC = async (): Promise<FetchProfileResult | null> => {
  const { data: sessionData } = await authClient.getSession();
  const user = sessionData?.user;

  if (!user) {
    return null;
  }

  const { data, error } = await api.rpc("get_my_profile");

  if (error || !data) {
    console.error("fetch profile failed:", error);
    return null;
  }

  const isAnonymous = user.isAnonymous === true;
  const sessionUser: SessionUserData = {
    id: user.id,
    // ゲストのメールには、サーバー側で、ダミーのアドレスが入っているので、画面には出さない
    email: isAnonymous ? null : (user.email ?? null),
    isAnonymous,
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
        // other(キーは、allow_bot_match_9 のように、アンダースコアつき)
        allowBotMatch9: rawProfile.allow_bot_match_9 ?? true,
        allowBotMatch13: rawProfile.allow_bot_match_13 ?? true,
        allowBotMatch19: rawProfile.allow_bot_match_19 ?? true,
        country: rawProfile.country ?? null,
      }
    : null;

  return {
    sessionUser,
    profile,
  };
};
