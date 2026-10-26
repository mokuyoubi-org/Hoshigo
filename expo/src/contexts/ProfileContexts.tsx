// ProfileContexts.tsx

import { createContext, ReactNode, useContext, useState } from "react";

// 1. プロフィールの型（素のデータ）
export type Profile = {
  uid: string | null;
  email: string | null;
  username: string | null;
  iconIndex: number | null;
  // 9
  wins9: number | null;
  losses9: number | null;
  draws9: number | null;
  rating9: number | null;
  giantKillingStreak9: number | null;
  // 13
  wins13: number | null;
  losses13: number | null;
  draws13: number | null;
  rating13: number | null;
  giantKillingStreak13: number | null;
  // 19
  wins19: number | null;
  losses19: number | null;
  draws19: number | null;
  rating19: number | null;
  giantKillingStreak19: number | null;
  // others
  allowBotMatch9: boolean | null;
  allowBotMatch13: boolean | null;
  allowBotMatch19: boolean | null;
  premiumUntil: number | null; // ⚠️numberであることに注意
  isPremium: boolean | null;
};

// Hookから返す全体の型
// isLoggedIn: ログインしているか(ビジターは false)
type ProfileContextValue = Profile & {
  isLoggedIn: boolean;
  updateProfile: (partial: Partial<Profile>) => void;
};

// 2. 初期値
export const initialProfile: Profile = {
  uid: null,
  email: null,
  username: null,
  iconIndex: null,
  // 9
  rating9: null,
  wins9: null,
  losses9: null,
  draws9: null,
  giantKillingStreak9: null,
  // 13
  rating13: null,
  wins13: null,
  losses13: null,
  draws13: null,
  giantKillingStreak13: null,
  // 19
  rating19: null,
  wins19: null,
  losses19: null,
  draws19: null,
  giantKillingStreak19: null,
  // others
  allowBotMatch9: null,
  allowBotMatch13: null,
  allowBotMatch19: null,
  premiumUntil: null,
  isPremium: null,
};

type ProfileContextType = {
  profile: Profile;
  updateProfile: (partial: Partial<Profile>) => void;
};

// 3. 🏢Context本体
const ProfileContext = createContext<ProfileContextType | null>(null);

// 4. 📡Provider
export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const updateProfile = (partial: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

// 5. Hook（identity情報だけを返す。
export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");

  const { profile, updateProfile } = ctx;

  return {
    ...profile,
    // ログインしていれば、プロフィールの同期で uid が入る(ビジターは null のまま)
    isLoggedIn: profile.uid !== null,
    updateProfile,
  };
};
