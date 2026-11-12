// Hoshigo
// auth-client.ts

import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

// authClientは、ログインとかログアウトしたい時に使う執事🫖
// authClient.signIn()
// getSession()
// getCookie()
// signOut()
// とか色々できる。

export const authClient = createAuthClient({
  // Workerのアドレス
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  plugins: [
    expoClient({
      scheme: "hoshigo",
      storagePrefix: "hoshigo",
      storage: SecureStore,
    }),
  ],
});
