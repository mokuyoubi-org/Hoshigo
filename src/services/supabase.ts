import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";
import { storage } from "./storage";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage, // スマホならスマホの、webならwebの。
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === "web", // Webの場合のみtrue
    },
  },
);

// // supabase.ts
// import { createClient } from "@supabase/supabase-js";
// import Constants from "expo-constants";
// import { Platform } from "react-native";
// import "react-native-url-polyfill/auto";
// import { storage } from "./storage";

// const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
// const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// if (!supabaseUrl) throw new Error("supabaseUrl is required");

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage,
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: Platform.OS === "web",
//   },
// });

export const handleAuthCallback = async (url: string) => {
  try {
    const urlObj = new URL(url);
    const access_token = urlObj.searchParams.get("access_token");
    const refresh_token = urlObj.searchParams.get("refresh_token");

    if (access_token && refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      return { data, error };
    }

    return { data: null, error: new Error("No tokens found in URL") };
  } catch (err) {
    return { data: null, error: err as Error };
  }
};
