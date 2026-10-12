// ProfileContexts.tsx

import { createContext, ReactNode, useContext, useState } from "react";

// 1. プロフィールの型（素のデータ）
type Profile = {
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
  isAnonymous: boolean;
  country: string | null;
};

// Hookから返す全体の型
type ProfileContextValue = Profile & {
  updateProfile: (partial: Partial<Profile>) => void;
};

// 2. 初期値
const initialProfile: Profile = {
  uid: null,
  email: null,
  username: null,
  iconIndex: 0,
  // 9
  rating9: 0,
  wins9: 0,
  losses9: 0,
  draws9: 0,
  giantKillingStreak9: 0,
  // 13
  rating13: 0,
  wins13: 0,
  losses13: 0,
  draws13: 0,
  giantKillingStreak13: 0,
  // 19
  rating19: 0,
  wins19: 0,
  losses19: 0,
  draws19: 0,
  giantKillingStreak19: 0,
  // others
  allowBotMatch9: true,
  allowBotMatch13: true,
  allowBotMatch19: true,
  isAnonymous: true,
  country: null,
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
    updateProfile,
  };
};
