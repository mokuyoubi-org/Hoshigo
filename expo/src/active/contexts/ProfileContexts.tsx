// ====================================================================================
// 【ファイル全体の責務】
// ⚡️コンテキストファイル⚡️
// 何をアプリ全体で共有してるか: プロフィール情報。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================

import React, { createContext, ReactNode, useContext, useState } from "react";

// 1. プロフィールの型
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
  groupIndex9: number | null;
  groupIndex13: number | null;
  allowBotMatch: boolean | null;
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
  points9: 10,
  points13: 10,
  groupIndex9: 0,
  groupIndex13: 0,
  allowBotMatch: true,
};

// 3. Context本体（外部には見せない）
const ProfileContext = createContext<{
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  updateProfile: (partial: Partial<Profile>) => void;
} | null>(null);

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

// 4. Provider（データ配給係）
export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const updateProfile = (partial: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

// 5. Hook（使う側の窓口）
export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
};
