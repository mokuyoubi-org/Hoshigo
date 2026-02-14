import { useRouter } from "expo-router";
import React, { ReactNode, useEffect, useState } from "react";
import { Linking } from "react-native";
import { supabase } from "../lib/supabase";

import { themeStore } from "../lib/storage";
import {
  AcquiredIconIndicesContext,
  DailyPlayCountContext,
  DisplayNameContext,
  EmailContext,
  GamesContext,
  GumiIndexContext,
  IconIndexContext,
  IsPremiumContext,
  JwtContext,
  PointsContext,
  RtContext,
  SetAcquiredIconIndicesContext,
  SetDailyPlayCountContext,
  SetDisplayNameContext,
  SetGamesContext,
  SetGumiIndexContext,
  SetIconIndexContext,
  SetIsPremiumContext,
  SetPointsContext,
  SetStarsContext,
  SetThemeContext,
  SetTutorialCompletedIndexContext,
  SetUserNameContext,
  StarsContext,
  ThemeContext,
  TutorialCompletedIndexContext,
  UidContext,
  UserNameContext,
} from "./UserContexts";

export function AppProviders({ children }: { children: ReactNode }) {
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
  const [stars, setStars] = useState<number>(0);
  const [acquiredIconIndices, setAcquiredIconIndices] = useState<number[]>([]);
  const [tutorialCompletedIndexContext, setTutorialCompletedIndexContext] =
    useState<number>(0);

  const router = useRouter();

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
          if ((type === "signup" || type === "recovery") && accessToken && refreshToken) {
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
    const linkingSubscription = Linking.addEventListener("url", async (event) => {
      console.log("📱 Deep link (runtime):", event.url);

      const [path, fragment] = event.url.split("#");
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if ((type === "signup" || type === "recovery") && accessToken && refreshToken) {
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
    });

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
          setStars(0);
          setGames(0);
          setTutorialCompletedIndexContext(0);
          setAcquiredIconIndices([]);
          router.replace("/Login");
        }
      },
    );

    return () => {
      linkingSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, []);

  // 2. ⭐️profileテーブルを取得
  useEffect(() => {
    if (checkingAuth) return;
    if (!uid) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "uid, username, displayname, points , icon_index, daily_play_count, is_premium, gumi_index, stars, games, tutorial_completed_index, acquired_icon_indices",
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
          setStars(0);
          setGames(0);
          setTutorialCompletedIndexContext(0);
          setAcquiredIconIndices([]);
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
        setStars(data.stars);
        setGames(data.games);
        setTutorialCompletedIndexContext(data.tutorial_completed_index);
        setAcquiredIconIndices(data.acquired_icon_indices);
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
                                                <StarsContext.Provider
                                                  value={stars}
                                                >
                                                  <SetStarsContext.Provider
                                                    value={setStars}
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
                                                        <AcquiredIconIndicesContext.Provider
                                                          value={
                                                            acquiredIconIndices
                                                          }
                                                        >
                                                          <SetAcquiredIconIndicesContext.Provider
                                                            value={
                                                              setAcquiredIconIndices
                                                            }
                                                          >
                                                            {children}
                                                          </SetAcquiredIconIndicesContext.Provider>
                                                        </AcquiredIconIndicesContext.Provider>
                                                      </SetTutorialCompletedIndexContext.Provider>
                                                    </TutorialCompletedIndexContext.Provider>
                                                  </SetStarsContext.Provider>
                                                </StarsContext.Provider>
                                              </SetGamesContext.Provider>
                                            </GamesContext.Provider>
                                          </SetGumiIndexContext.Provider>
                                        </GumiIndexContext.Provider>
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