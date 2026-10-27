// profileRPC.ts

import type { BoardStats, Profile } from "@/src/contexts/ProfileContexts";
import { api } from "@/src/services/api/api";
import { authClient } from "@/src/services/auth/auth-client";

// Profile(お手本)から、sessionUser側で返す2つを除いたもの
type ProfileData = Omit<Profile, "uid" | "email">;

type SessionUserData = {
  id: string;
  email: string | null;
};

type FetchProfileResult = {
  sessionUser: SessionUserData | null;
  profile: ProfileData | null;
};

// サーバーの盤面1つぶんの箱(snake_case)を、アプリ側の形に直す
const toBoardStats = (raw: any): BoardStats => ({
  wins: raw?.wins ?? 0,
  losses: raw?.losses ?? 0,
  draws: raw?.draws ?? 0,
  rating: raw?.rating ?? 0,
});

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

  const sessionUser: SessionUserData = {
    id: user.id,
    email: user.email ?? null,
  };

  const rawProfile = data.profile;
  const profile: ProfileData | null = rawProfile
    ? {
        username: rawProfile.username ?? "",
        iconIndex: rawProfile.icon_index ?? 0,
        allowBotMatch: rawProfile.allow_bot_match ?? true,
        stats: {
          9: toBoardStats(rawProfile.stats?.[9]),
          13: toBoardStats(rawProfile.stats?.[13]),
          19: toBoardStats(rawProfile.stats?.[19]),
        },
        premiumUntil: rawProfile.premium_until ?? null, // ⚠️numberであることに注意
        isPremium: rawProfile.is_premium ?? null,
      }
    : null;

  return {
    sessionUser,
    profile,
  };
};
