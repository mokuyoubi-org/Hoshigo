// ProfileContexts.tsx
import React, { createContext, ReactNode, useContext, useState } from "react";

// 1. プロフィールの型（素のデータ）
export type Profile = {
  uid: string | null;
  email: string | null;
  username: string | null;
  iconIndex: number | null;
  acquiredIcons: number[] | null;
  games9: number | null;
  games13: number | null;
  points9: number | null;
  points13: number | null;
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
  games9: 0,
  games13: 0,
  points9: 0,
  points13: 0,
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
