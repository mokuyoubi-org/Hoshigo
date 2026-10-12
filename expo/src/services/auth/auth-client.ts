// auth-client.ts

import { expoClient } from "@better-auth/expo/client";
import { anonymousClient, emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  // Workerのアドレス(Expoの環境変数ファイルに入れる)
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  plugins: [
    expoClient({
      scheme: "hoshigo",
      storagePrefix: "hoshigo",
      storage: SecureStore,
    }),
    anonymousClient(),
    emailOTPClient(),
  ],
});
