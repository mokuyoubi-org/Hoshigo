// src/components/AppProviders.tsx
import {
  checkSubscriptionStatus,
  initializePurchases,
  loginRevenueCat,
  logoutRevenueCat,
} from "@/src/services/RevenueCat";
import { themeStore } from "@/src/services/storage";
import { supabase } from "@/src/services/supabase";
import { useRouter } from "expo-router";
import React, { ReactNode, useEffect, useState } from "react";
import { Linking } from "react-native";
import type { CustomerInfo } from "react-native-purchases";

import {
  DisplayNameContext,
  EmailContext,
  GamesContext,
  GumiIndexContext,
  IconIndexContext,
  IsPremiumContext,
  JwtContext,
  PointsContext,
  RefreshRevenueCatContext,
  RevenueCatCustomerInfoContext,
  RtContext,
  SetDisplayNameContext,
  SetGamesContext,
  SetGumiIndexContext,
  SetIconIndexContext,
  SetIsPremiumContext,
  SetPointsContext,
  SetRevenueCatCustomerInfoContext,
  SetTutorialCompletedIndexContext,
  SetUserNameContext,
  TutorialCompletedIndexContext,
  UidContext,
  UserNameContext,
} from "@/src/contexts/UserContexts";
import {
  MaintenanceContext,
  MaintenanceMessageContext,
  ThemeContext,
} from "@/src/contexts/AppContexts";
import {
  defaultLang,
  LangContext,
  SetLangContext
} from "@/src/contexts/LocaleContexts";
import {
  AntDesign,
  FontAwesome5,
  FontAwesome6,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import * as Font from "expo-font";
import { Lang, translations } from "../services/translations";
import AsyncStorage from "@react-native-async-storage/async-storage";


// ------------------------------------------------------------------ //
// AppProviders
// ------------------------------------------------------------------ //
export function AppProviders({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = Font.useFonts({
    ...AntDesign.font,
    ...FontAwesome5.font,
    ...FontAwesome6.font,
    ...MaterialIcons.font,
    ...Octicons.font,
  });

  console.log("fontsLoaded:", fontsLoaded, "fontError:", fontError);
  const [rcInitialized, setRcInitialized] = useState<boolean>(false);

  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [jwt, setJwt] = useState<string | null>(null);
  const [rt, setRt] = useState<string | null>(null);
  const [theme, setTheme] = useState<"standard" | "light" | "dark">("standard");
  const [iconIndex, setIconIndex] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [gumiIndex, setGumiIndex] = useState<number>(0);
  const [games, setGames] = useState<number>(0);
  const [tutorialCompletedIndex, setTutorialCompletedIndex] =
    useState<number>(0);

  // 🆕 RevenueCat用のstate
  const [revenueCatCustomerInfo, setRevenueCatCustomerInfo] =
    useState<CustomerInfo | null>(null);
  const [revenueCatLoading, setRevenueCatLoading] = useState<boolean>(true);

  // 🆕 メンテナンス状態
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );

const [lang, setLang] = useState<Lang>(defaultLang);

useEffect(() => {
  AsyncStorage.getItem("userLang").then((saved) => {
    if (saved && saved in translations) setLang(saved as Lang);
  });
}, []);

const saveLang = async (newLang: Lang) => {
  await AsyncStorage.setItem("userLang", newLang);
  setLang(newLang);
};
  const router = useRouter();

  // 🆕 app_statusをSubscribe
  useEffect(() => {
    // 初回取得
    const fetchAppStatus = async () => {
      const { data, error } = await supabase
        .from("app_status")
        .select("maintenance, message")
        .single();
      if (error) {
        console.error("❌ app_status fetch failed:", error);
        return;
      }
      setMaintenance(data.maintenance);
      setMaintenanceMessage(data.message);
    };
    fetchAppStatus();

    // リアルタイムSubscribe
    const channel = supabase
      .channel("app_status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_status" },
        (payload) => {
          console.log("🔔 app_status changed:", payload.new);
          setMaintenance(payload.new.maintenance);
          setMaintenanceMessage(payload.new.message);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🆕 RevenueCatを初期化
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        await initializePurchases();
        console.log("✅ RevenueCat initialized");

        const { isPro, customerInfo } = await checkSubscriptionStatus();
        setRevenueCatCustomerInfo(customerInfo);
        setRevenueCatLoading(false);
        setRcInitialized(true);

        console.log("📊 Initial subscription status:", isPro);
      } catch (error) {
        console.error("❌ RevenueCat initialization failed:", error);
        setRevenueCatLoading(false);
      }
    };

    initRevenueCat();
  }, []);

  // 🆕 サブスク状態を再チェックする関数
  const refreshRevenueCat = async () => {
    setRevenueCatLoading(true);
    const { isPro, customerInfo } = await checkSubscriptionStatus();
    setRevenueCatCustomerInfo(customerInfo);
    setIsPremium(isPro);
    setRevenueCatLoading(false);

    if (uid) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: isPro })
        .eq("uid", uid);

      if (error) {
        console.error("❌ Failed to update is_premium in Supabase:", error);
      } else {
        console.log("✅ Supabase is_premium updated:", isPro);
      }
    }
  };

  // 1. ⭐️ログインチェック
  useEffect(() => {
    const initAuth = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        console.log("📱 Initial URL:", initialUrl);

        const [path, fragment] = initialUrl.split("#");
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (
            (type === "signup" || type === "recovery") &&
            accessToken &&
            refreshToken
          ) {
            console.log("🔐 Auth link detected, type:", type);

            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Session setup error:", error);
            } else if (data.session) {
              console.log("✅ Session established from deep link");
              setUid(data.session.user.id);
              setEmail(data.session.user.email!);
              setJwt(data.session.access_token);
              setRt(data.session.refresh_token);
              setCheckingAuth(false);
              return;
            }
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUid(data.session.user.id);
        setEmail(data.session.user.email!);
        setJwt(data.session.access_token);
        setRt(data.session.refresh_token);
      } else {
        router.replace("/Login");
      }
      setCheckingAuth(false);
    };

    initAuth();

    const linkingSubscription = Linking.addEventListener(
      "url",
      async (event) => {
        console.log("📱 Deep link (runtime):", event.url);

        const [path, fragment] = event.url.split("#");
        if (!fragment) return;

        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (
          (type === "signup" || type === "recovery") &&
          accessToken &&
          refreshToken
        ) {
          console.log("🔐 Auth link detected, type:", type);

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Session setup error:", error);
          } else if (data.session) {
            console.log("✅ Session established");
          }
        }
      },
    );

    // 🐱見張り猫🐱の設置
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🐱 Auth event:", event, "Has session:", !!session);
        console.log(email);

        if (event === "PASSWORD_RECOVERY") {
          console.log("🔑 Password recovery event");
          if (session?.user) {
            setUid(session.user.id);
            setEmail(session.user.email!);
            setJwt(session.access_token);
            setRt(session.refresh_token);
          }
          return;
        }

        if (session?.user) {
          setUid(session.user.id);
          setEmail(session.user.email!);
          setJwt(session.access_token);
          setRt(session.refresh_token);
        } else {
          setUid(null);
          setEmail(null);
          setJwt(null);
          setRt(null);
          setUserName(null);
          setDisplayName(null);
          setPoints(0);
          setIconIndex(0);
          setIsPremium(false);
          setGumiIndex(0);
          setGames(0);
          setTutorialCompletedIndex(0);
          router.replace("/Login");
        }
      },
    );

    return () => {
      linkingSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ================================
  // 🆕 uidが変わったらRevenueCatにログイン
  // ================================
  useEffect(() => {
    if (!rcInitialized) return;

    if (uid) {
      console.log("🔑 Logging in to RevenueCat with uid:", uid);
      loginRevenueCat(uid);
    } else {
      logoutRevenueCat().catch(() => {});
    }
  }, [uid, rcInitialized]);

  // 2. ⭐️profileテーブルを取得
  useEffect(() => {
    if (checkingAuth) return;
    if (!uid) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "uid, username, displayname, points , icon_index, daily_play_count, is_premium, gumi_index, games, tutorial_completed_index",
        )
        .eq("uid", uid)
        .single();
      if (error) {
        if (error.code === "PGRST116") {
          console.log("profile does not exist yet");
          setUserName(null);
          setDisplayName(null);
          setPoints(0);
          setIconIndex(0);
          setIsPremium(false);
          setGumiIndex(0);
          setGames(0);
          setTutorialCompletedIndex(0);
          router.replace("/RegisterProfile");
          return;
        }
        console.error("fetch profile failed", error);
      } else if (data) {
        console.log("fetch profile ok");
        console.log("data.icon_index: ", data.icon_index);

        setUserName(data.username);
        setDisplayName(data.displayname);
        setPoints(data.points);
        setIconIndex(data.icon_index);
        setIsPremium(data.is_premium);
        setGumiIndex(data.gumi_index);
        setGames(data.games);
        setTutorialCompletedIndex(data.tutorial_completed_index);

        await refreshRevenueCat();

        router.replace("/(tabs)/Home");
      }
    };
    fetchProfile();
  }, [uid, checkingAuth]);

  // テーマ: 起動時に読み込む
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await themeStore.get();
      if (
        saved !== null &&
        (saved === "standard" || saved === "light" || saved === "dark")
      ) {
        setTheme(saved);
        themeStore.set(saved);
      } else {
        const defaultTheme = "standard";
        setTheme(defaultTheme);
        themeStore.set(defaultTheme);
      }
    };
    loadTheme();
  }, []);

  if (!fontsLoaded) return null;











  // AppProviders.tsx

const providers: Array<[React.Context<any>, any]> = [
  [UidContext, uid],
  [EmailContext, email],
  [UserNameContext, userName],
  [SetUserNameContext, setUserName],
  [DisplayNameContext, displayName],
  [SetDisplayNameContext, setDisplayName],
  [PointsContext, points],
  [SetPointsContext, setPoints],
  [JwtContext, jwt],
  [RtContext, rt],
  [ThemeContext, {theme,setTheme}],
  [IconIndexContext, iconIndex],
  [SetIconIndexContext, setIconIndex],
  [IsPremiumContext, isPremium],
  [SetIsPremiumContext, setIsPremium],
  [RevenueCatCustomerInfoContext, revenueCatCustomerInfo],
  [SetRevenueCatCustomerInfoContext, setRevenueCatCustomerInfo],
  [RefreshRevenueCatContext, refreshRevenueCat],
  [GumiIndexContext, gumiIndex],
  [SetGumiIndexContext, setGumiIndex],
  [GamesContext, games],
  [SetGamesContext, setGames],
  [TutorialCompletedIndexContext, tutorialCompletedIndex],
  [SetTutorialCompletedIndexContext, setTutorialCompletedIndex],
  [MaintenanceContext, maintenance],
  [MaintenanceMessageContext, maintenanceMessage],
  [LangContext, lang],                       // 新規追加
  [SetLangContext, setLang],                 // 新規追加
];

return providers.reduceRight(
  (children, [Context, value]) => (
    <Context.Provider value={value}>{children}</Context.Provider>
  ),
  <>{children}</>
);
}
