// ProfileContexts.tsx

import { createContext, ReactNode, useContext, useState } from "react";

// 盤面サイズ。ループしたいときは BOARD_SIZES を使う
export const BOARD_SIZES = [9, 13, 19] as const;
export type OnlineBoardSize = (typeof BOARD_SIZES)[number];

// 9・13・19のどれかかどうか(5は、オンライン成績の対象外)
export const isOnlineBoardSize = (size: number): size is OnlineBoardSize =>
  (BOARD_SIZES as readonly number[]).includes(size);

// 1つの盤面サイズぶんの成績・設定
export type BoardStats = {
  wins: number | null;
  losses: number | null;
  draws: number | null;
  rating: number | null;
  allowBotMatch: boolean | null;
};

// 1. プロフィールの型（素のデータ）
export type Profile = {
  uid: string | null;
  email: string | null;
  username: string | null;
  iconIndex: number | null;
  stats: Record<OnlineBoardSize, BoardStats>;
  premiumUntil: number | null; // ⚠️numberであることに注意
  isPremium: boolean | null;
};

// Hookから返す全体の型
type ProfileContextValue = Profile & {
  updateProfile: (partial: Partial<Profile>) => void;
  updateStats: (size: OnlineBoardSize, partial: Partial<BoardStats>) => void;
};

// 2. 初期値
const emptyStats: BoardStats = {
  wins: null,
  losses: null,
  draws: null,
  rating: null,
  allowBotMatch: null,
};

export const initialProfile: Profile = {
  uid: null,
  email: null,
  username: null,
  iconIndex: null,
  stats: { 9: emptyStats, 13: emptyStats, 19: emptyStats },
  premiumUntil: null,
  isPremium: null,
};

type ProfileContextType = {
  profile: Profile;
  updateProfile: (partial: Partial<Profile>) => void;
  updateStats: (size: OnlineBoardSize, partial: Partial<BoardStats>) => void;
};

// 3. 🏢Context本体
const ProfileContext = createContext<ProfileContextType | null>(null);

// 4. 📡Provider
export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const updateProfile = (partial: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  // 盤面サイズを1つ指定して、その盤面の成績だけ更新する
  const updateStats = (size: OnlineBoardSize, partial: Partial<BoardStats>) => {
    setProfile((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        [size]: { ...prev.stats[size], ...partial },
      },
    }));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, updateStats }}>
      {children}
    </ProfileContext.Provider>
  );
};

// 5. Hook（identity情報だけを返す。
export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");

  const { profile, updateProfile, updateStats } = ctx;

  return {
    ...profile,
    updateProfile,
    updateStats,
  };
};