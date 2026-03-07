// src/components/AppProviders.tsx
import { useRouter } from "expo-router";
import React, { ReactNode, useEffect, useState } from "react";
import { Linking } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import {
  checkSubscriptionStatus,
  initializePurchases,
  loginRevenueCat, // ← 追加
  logoutRevenueCat, // ← 追加
} from "../services/RevenueCat";
import { themeStore } from "../services/storage";
import { supabase } from "../services/supabase";

import {
  AntDesign,
  FontAwesome5,
  FontAwesome6,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import * as Font from "expo-font";
import {
  DailyPlayCountContext,
  DisplayNameContext,
  EmailContext,
  GamesContext,
  GumiIndexContext,
  IconIndexContext,
  IsPremiumContext,
  JwtContext,
  PointsContext,
  // RevenueCatLoadingContext,
  RefreshRevenueCatContext,
  // 🆕 RevenueCat用のContextを追加
  RevenueCatCustomerInfoContext,
  RtContext,
  SetDailyPlayCountContext,
  SetDisplayNameContext,
  SetGamesContext,
  SetGumiIndexContext,
  SetIconIndexContext,
  SetIsPremiumContext,
  SetPointsContext,
  SetRevenueCatCustomerInfoContext,
  SetThemeContext,
  SetTutorialCompletedIndexContext,
  SetUserNameContext,
  ThemeContext,
  TutorialCompletedIndexContext,
  UidContext,
  UserNameContext,
} from "./UserContexts";

export function AppProviders({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = Font.useFonts({
    ...AntDesign.font,
    ...FontAwesome5.font,
    ...FontAwesome6.font,
    ...MaterialIcons.font,
    ...Octicons.font,
  });

  console.log("fontsLoaded:", fontsLoaded, "fontError:", fontError);
  const [rcInitialized, setRcInitialized] = useState<boolean>(false); // ← 追加

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
  const [dailyPlayCount, setDailyPlayCount] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [gumiIndex, setGumiIndex] = useState<number>(0);
  const [games, setGames] = useState<number>(0);
  const [tutorialCompletedIndexContext, setTutorialCompletedIndexContext] =
    useState<number>(0);

  // 🆕 RevenueCat用のstate
  const [revenueCatCustomerInfo, setRevenueCatCustomerInfo] =
    useState<CustomerInfo | null>(null);
  const [revenueCatLoading, setRevenueCatLoading] = useState<boolean>(true);

  const router = useRouter();

  // 🆕 RevenueCatを初期化
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        await initializePurchases();
        console.log("✅ RevenueCat initialized");

        const { isPro, customerInfo } = await checkSubscriptionStatus();
        setRevenueCatCustomerInfo(customerInfo);
        setRevenueCatLoading(false);
        setRcInitialized(true); // ← 追加！初期化完了フラグ

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

    // Supabaseのprofilesテーブルも更新
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
      // 🆕 まずDeep Linkをチェック
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        console.log("📱 Initial URL:", initialUrl);

        const [path, fragment] = initialUrl.split("#");
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          // signup の場合もセッションを確立
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
              return; // セッション確立したのでここで終了
            }
          }
        }
      }

      // Deep Linkがない、または失敗した場合は通常のセッションチェック
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

    // URL変更を監視（アプリ起動中のリンククリック用）
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
          setDailyPlayCount(0);
          setIsPremium(false);
          setGumiIndex(0);
          setGames(0);
          setTutorialCompletedIndexContext(0);
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
      // RevenueCatにログイン済みの場合のみlogoutを呼ぶ
      logoutRevenueCat().catch(() => {
        // 未ログイン状態でのlogoutは無視
      });
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
          setDailyPlayCount(0);
          setIsPremium(false);
          setGumiIndex(0);
          setGames(0);
          setTutorialCompletedIndexContext(0);
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
        setDailyPlayCount(data.daily_play_count);
        setIsPremium(data.is_premium);
        setGumiIndex(data.gumi_index);
        setGames(data.games);
        setTutorialCompletedIndexContext(data.tutorial_completed_index);

        // 🆕 プロフィール取得後、RevenueCatと同期
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
  return (
    <UidContext.Provider value={uid}>
      <EmailContext.Provider value={email}>
        <UserNameContext.Provider value={userName}>
          <SetUserNameContext.Provider value={setUserName}>
            <DisplayNameContext.Provider value={displayName}>
              <SetDisplayNameContext.Provider value={setDisplayName}>
                <PointsContext.Provider value={points}>
                  <SetPointsContext.Provider value={setPoints}>
                    <JwtContext.Provider value={jwt}>
                      <RtContext.Provider value={rt}>
                        <ThemeContext.Provider value={theme}>
                          <SetThemeContext.Provider value={setTheme}>
                            <IconIndexContext.Provider value={iconIndex}>
                              <SetIconIndexContext.Provider
                                value={setIconIndex}
                              >
                                <DailyPlayCountContext.Provider
                                  value={dailyPlayCount}
                                >
                                  <SetDailyPlayCountContext.Provider
                                    value={setDailyPlayCount}
                                  >
                                    <IsPremiumContext.Provider
                                      value={isPremium}
                                    >
                                      <SetIsPremiumContext.Provider
                                        value={setIsPremium}
                                      >
                                        <RevenueCatCustomerInfoContext.Provider
                                          value={revenueCatCustomerInfo}
                                        >
                                          <SetRevenueCatCustomerInfoContext.Provider
                                            value={setRevenueCatCustomerInfo}
                                          >
                                            {/* <RevenueCatLoadingContext.Provider value={revenueCatLoading}> */}
                                            <RefreshRevenueCatContext.Provider
                                              value={refreshRevenueCat}
                                            >
                                              <GumiIndexContext.Provider
                                                value={gumiIndex}
                                              >
                                                <SetGumiIndexContext.Provider
                                                  value={setGumiIndex}
                                                >
                                                  <GamesContext.Provider
                                                    value={games}
                                                  >
                                                    <SetGamesContext.Provider
                                                      value={setGames}
                                                    >
                                                      <TutorialCompletedIndexContext.Provider
                                                        value={
                                                          tutorialCompletedIndexContext
                                                        }
                                                      >
                                                        <SetTutorialCompletedIndexContext.Provider
                                                          value={
                                                            setTutorialCompletedIndexContext
                                                          }
                                                        >
                                                          {children}
                                                        </SetTutorialCompletedIndexContext.Provider>
                                                      </TutorialCompletedIndexContext.Provider>
                                                    </SetGamesContext.Provider>
                                                  </GamesContext.Provider>
                                                </SetGumiIndexContext.Provider>
                                              </GumiIndexContext.Provider>
                                            </RefreshRevenueCatContext.Provider>
                                            {/* </RevenueCatLoadingContext.Provider> */}
                                          </SetRevenueCatCustomerInfoContext.Provider>
                                        </RevenueCatCustomerInfoContext.Provider>
                                      </SetIsPremiumContext.Provider>
                                    </IsPremiumContext.Provider>
                                  </SetDailyPlayCountContext.Provider>
                                </DailyPlayCountContext.Provider>
                              </SetIconIndexContext.Provider>
                            </IconIndexContext.Provider>
                          </SetThemeContext.Provider>
                        </ThemeContext.Provider>
                      </RtContext.Provider>
                    </JwtContext.Provider>
                  </SetPointsContext.Provider>
                </PointsContext.Provider>
              </SetDisplayNameContext.Provider>
            </DisplayNameContext.Provider>
          </SetUserNameContext.Provider>
        </UserNameContext.Provider>
      </EmailContext.Provider>
    </UidContext.Provider>
  );
}
