// src/components/AppProviders.tsx
import {
  MaintenanceContext,
  MaintenanceMessageContext,
  ThemeContext,
} from "@/src/contexts/AppContexts";
import { defaultLang, LangContext } from "@/src/contexts/LocaleContexts";
import {
  AcquiredIconsContext,
  DisplaynameContext,
  EmailContext,
  GamesContext,
  GumiIndexContext,
  IconIndexContext,
  JwtContext,
  PlanIdContext,
  PointsContext,
  RtContext,
  TsumegoProgressContext,
  TutorialProgressContext,
  UidContext,
  UsernameContext,
} from "@/src/contexts/UserContexts";
import { IAPProvider } from "@/src/providers/IAPProvider";
import { langStore, themeStore } from "@/src/services/storage";
import { supabase } from "@/src/services/supabase";
import { Lang } from "@/src/services/translations";
import { useRouter } from "expo-router";
import React, { ReactNode, useEffect, useState } from "react";
import { Linking } from "react-native";
// ------------------------------------------------------------------ //
// AppProviders
// ------------------------------------------------------------------ //
export function AppProviders({ children }: { children: ReactNode }) {
  // ユーザ情報
  const [email, setEmail] = useState<string | null>(null); // メアド
  const [uid, setUid] = useState<string | null>(null); // uid
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true); // ロード中フラグ
  const [jwt, setJwt] = useState<string | null>(null); // jwt
  const [rt, setRt] = useState<string | null>(null); // rt
  const [username, setUsername] = useState<string | null>(null); // ユーザ名
  const [displayname, setDisplayname] = useState<string | null>(null); // 表示名
  const [points, setPoints] = useState<number>(10); // ポイント
  const [iconIndex, setIconIndex] = useState<number>(0); // アイコン
  const [gumiIndex, setGumiIndex] = useState<number>(0); // ぐみ
  const [games, setGames] = useState<number>(0); // 対局数
  const [planId, setPlanId] = useState<number>(0); // 対局数
  const [tutorialProgress, setTutorialProgress] = useState<number>(0); // 講座はどこまで進んだか
  const [tsumegoProgress, setTsumegoProgress] = useState<number[]>([]); // 講座はどこまで進んだか
  const [acquiredIcons, setAcquiredIcons] = useState<number[]>([]); // 講座はどこまで進んだか
  const [theme, setTheme] = useState<"standard">("standard"); // テーマ
  const [maintenance, setMaintenance] = useState<boolean>(false); // メンテナンス中か否か
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  ); // メンテナンスメッセージ
  const [lang, setLang] = useState<Lang>(defaultLang); // 言語
  const router = useRouter();

  // -------------- 初期化 --------------

  // 順番
  // 1. ローカル系(言語、テーマ)
  // 2. auth(ログイン)
  // 3. メンテ中か確認
  // 4. プロフィール取得

  // 1. 言語とテーマを取ってくる(ローカル)
  useEffect(() => {
    // 言語とってくる
    const validLangs: Lang[] = ["ja", "en", "zh", "ko"];

    const loadLang = async () => {
      const saved = await langStore.get();
      if (saved && validLangs.includes(saved as Lang)) {
        setLang(saved as Lang);
      }
    };
    loadLang();

    // テーマとってくる
    const loadTheme = async () => {
      const saved = await themeStore.get();
      if (saved !== null && saved === "standard") {
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

  // 2. ログインチェック
  useEffect(() => {
    const initAuth = async () => {
      // メールからurlを踏んでアプリに飛んだ時
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

      // ローカルを見ている。ローカルからデータを取り出す
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUid(data.session.user.id);
        setEmail(data.session.user.email!);
        setJwt(data.session.access_token);
        setRt(data.session.refresh_token);
      } else {
        // Contextを全部リセット
        setUid(null);
        setEmail(null);
        setJwt(null);
        setRt(null);
        setUsername(null);
        setDisplayname(null);
        setPoints(10);
        setIconIndex(0);
        setGumiIndex(0);
        setGames(0);
        setTutorialProgress(0);
        setTsumegoProgress([]);
        setAcquiredIcons([]);
        setPlanId(0);
        // setIsPremium(false);
        // setRevenueCatCustomerInfo(null);
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
            setCheckingAuth(false);
          }
          return;
        }

        if (session?.user) {
          setUid(session.user.id);
          setEmail(session.user.email!);
          setJwt(session.access_token);
          setRt(session.refresh_token);
          setCheckingAuth(false);
        } else {
          // Contextを全部リセット
          setUid(null);
          setEmail(null);
          setJwt(null);
          setRt(null);
          setUsername(null);
          setDisplayname(null);
          setPoints(10);
          setIconIndex(0);
          setGumiIndex(0);
          setGames(0);
          setTutorialProgress(0);
          setTsumegoProgress([]);
          setAcquiredIcons([]);
          setPlanId(0);
          setCheckingAuth(false);
          router.replace("/Login");
        }
      },
    );

    return () => {
      linkingSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, []);

  // 3. メンテナンス中かどうかの確認
  useEffect(() => {
    const fetchAppStatus = async () => {
      const { data, error } = await supabase
        .schema("system")
        .rpc("get_app_status");

      if (error) {
        console.error("❌ app_status fetch failed:", error);
        return;
      }

      if (!data || data.length === 0) {
        console.error("❌ app_status is empty");
        return;
      }

      const status = data[0];
      console.log("✅ app_status fetched:", status);

      setMaintenance(status.maintenance);
      setMaintenanceMessage(status.message);
    };

    fetchAppStatus();
  }, []);

  // 4. profileテーブルを取得
  useEffect(() => {
    if (checkingAuth) return;
    if (!uid) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .schema("users")
        .rpc("get_my_profile");
      if (error) {
        console.error("fetch profile failed", error);
        return;
      }

      // RPCはデータが空配列の場合、プロフィール未作成とみなす
      if (!data) {
        console.log("profile does not exist yet");
        router.replace("/RegisterProfile");
        return;
      }

      const profile = data;
      setUsername(profile.username); // ユーザ名
      setDisplayname(profile.displayname); // 表示名
      setPoints(profile.points); // ポイント
      setIconIndex(profile.icon_index); // アイコン
      setGumiIndex(profile.gumi_index); // ぐみ
      setGames(profile.games); // 対局数
      setTutorialProgress(profile.tutorial_progress); // 講座
      setTsumegoProgress(profile.tsumego_progress); // 詰碁
      setAcquiredIcons(profile.acquired_icons); // 獲得済アイコン
      setPlanId(profile.plan_id);
      // 遷移
      router.replace("/(tabs)/Home");
    };

    fetchProfile();
  }, [uid, checkingAuth]);

  // プロバイダで包む
  const providers: Array<[React.Context<any>, any]> = [
    [UidContext, uid],
    [EmailContext, email],
    [JwtContext, jwt],
    [RtContext, rt],
    [UsernameContext, { username, setUsername }],
    [DisplaynameContext, { displayname, setDisplayname }],
    [PointsContext, { points, setPoints }],
    [ThemeContext, { theme, setTheme }],
    [IconIndexContext, { iconIndex, setIconIndex }],
    [GumiIndexContext, { gumiIndex, setGumiIndex }],
    [GamesContext, { games, setGames }],
    [TutorialProgressContext, { tutorialProgress, setTutorialProgress }],
    [TsumegoProgressContext, { tsumegoProgress, setTsumegoProgress }],
    [AcquiredIconsContext, { acquiredIcons, setAcquiredIcons }],
    [PlanIdContext, { planId, setPlanId }],
    [MaintenanceContext, { maintenance, setMaintenance }],
    [MaintenanceMessageContext, { maintenanceMessage, setMaintenanceMessage }],
    [LangContext, { lang, setLang }],
  ];

  return (
    <IAPProvider>
      {providers.reduceRight(
        (children, [Context, value]) => (
          <Context.Provider value={value}>{children}</Context.Provider>
        ),
        children,
      )}
    </IAPProvider>
  );
}
