// ProfileContexts.tsx
import React, { createContext, ReactNode, useContext, useState } from "react";

// 1. プロフィールの型（素のデータ）
export type Profile = {
  uid: string | null;
  email: string | null;
  username: string | null;
  iconIndex: number | null;
  acquiredIcons: number[] | null;
  wins9: number | null;
  losses9: number | null;
  draws9: number | null;
  wins13: number | null;
  losses13: number | null;
  draws13: number | null;
  rating9: number | null;
  rating13: number | null;
  allowBotMatch: boolean | null;
  isAnonymous: boolean;
};

// Hookから返す全体の型
export type ProfileContextValue = Profile & {
  updateProfile: (partial: Partial<Profile>) => void;
  replaceProfile: (next: Profile) => void;
};

// 2. 初期値
const initialProfile: Profile = {
  uid: null,
  email: null,
  username: null,
  iconIndex: 0,
  acquiredIcons: [0],
  rating9: 0,
  wins9: 0,
  losses9: 0,
  draws9: 0,
  rating13: 0,
  wins13: 0,
  losses13: 0,
  draws13: 0,
  allowBotMatch: true,
  isAnonymous: true,
};

type ProfileContextType = {
  profile: Profile;
  updateProfile: (partial: Partial<Profile>) => void;
  replaceProfile: (next: Profile) => void;
};

// 3. 🏢Context本体
const ProfileContext = createContext<ProfileContextType | null>(null);

// 4. 📡Provider
export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const updateProfile = (partial: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  const replaceProfile = (next: Profile) => {
    setProfile(next);
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, replaceProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

// 5. Hook（identity情報だけを返す。
export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");

  const { profile, updateProfile, replaceProfile } = ctx;

  return {
    ...profile,
    updateProfile,
    replaceProfile,
  };
};
