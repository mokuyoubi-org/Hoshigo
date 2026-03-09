// @/src/contexts/UserContexts.tsx
import { createContext } from "react";
import { CustomerInfo } from "react-native-purchases";

export const EmailContext = createContext<string | null>(null);
export const UidContext = createContext<string | null>(null);
export const UserNameContext = createContext<string | null>(null);
export const SetUserNameContext = createContext<
  ((value: string) => void) | null
>(null);
export const DisplayNameContext = createContext<string | null>(null);
export const SetDisplayNameContext = createContext<
  ((value: string) => void) | null
>(null);
export const PointsContext = createContext<number | null>(null);
export const SetPointsContext = createContext<((value: number) => void) | null>(
  null,
);
export const GamesContext = createContext<number | null>(null);
export const SetGamesContext = createContext<((value: number) => void) | null>(
  null,
);
export const IconIndexContext = createContext<number | null>(null);
export const SetIconIndexContext = createContext<
  ((value: number) => void) | null
>(null);

export const TutorialCompletedIndexContext = createContext<number | null>(null);
export const SetTutorialCompletedIndexContext = createContext<
  ((value: number) => void) | null
>(null);

export const JwtContext = createContext<string | null>(null);
export const RtContext = createContext<string | null>(null);


export const IsPremiumContext = createContext<boolean | null>(null);
export const SetIsPremiumContext = createContext<
  ((value: boolean) => void) | null
>(null);

export const GumiIndexContext = createContext<number | null>(null);
export const SetGumiIndexContext = createContext<
  ((value: number) => void) | null
>(null);


export const RevenueCatCustomerInfoContext = createContext<CustomerInfo | null>(
  null,
);
export const SetRevenueCatCustomerInfoContext = createContext<React.Dispatch<
  React.SetStateAction<CustomerInfo | null>
> | null>(null);
export const RefreshRevenueCatContext = createContext<
  (() => Promise<void>) | null
>(null);
