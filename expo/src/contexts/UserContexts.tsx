// @/src/contexts/UserContexts.tsx
import { createContext } from "react";
// メアド
export const EmailContext = createContext<string | null>(null);
// uid
export const UidContext = createContext<string | null>(null);
// jwt
export const JwtContext = createContext<string | null>(null);
// rt
export const RtContext = createContext<string | null>(null);

// ユーザ名
export const UsernameContext = createContext<{
  username: string | null;
  setUsername: ((v: string) => void) | null;
} | null>(null);

// 表示名
export const DisplaynameContext = createContext<{
  displayname: string | null;
  setDisplayname: ((v: string) => void) | null;
} | null>(null);

// 対局数
export const GamesContext = createContext<{
  games: number | null;
  setGames: ((v: number) => void) | null;
} | null>(null);

// プランid
export const PlanIdContext = createContext<{
  planId: number | null;
  setPlanId: ((v: number) => void) | null;
} | null>(null);

// アイコン
export const IconIndexContext = createContext<{
  iconIndex: number | null;
  setIconIndex: ((v: number) => void) | null;
} | null>(null);

// どこまで講座は終わったか
export const TutorialProgressContext = createContext<{
  tutorialProgress: number | null;
  setTutorialProgress: ((v: number) => void) | null;
} | null>(null);

// どこまで詰碁は終わったか
export const TsumegoProgressContext = createContext<{
  tsumegoProgress: number[] | null;
  setTsumegoProgress: ((v: number[]) => void) | null;
} | null>(null);

// 獲得したアイコンのindexの配列
export const AcquiredIconsContext = createContext<{
  acquiredIcons: number[] | null;
  setAcquiredIcons: ((v: number[]) => void) | null;
} | null>(null);

// ポイント
export const PointsContext = createContext<{
  points: number | null;
  setPoints: ((v: number) => void) | null;
} | null>(null);

// ぐみ
export const GumiIndexContext = createContext<{
  gumiIndex: number | null;
  setGumiIndex: ((v: number) => void) | null;
} | null>(null);
