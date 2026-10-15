// app.config.ts
// アプリの設計図。
// Expo総監督に対する指示。

// package.jsonは、このアプリを作るためには、これinstallしといて！という、買い物メモ。
// package-lock.jsonは、実際にinstallしたものの、詳細なレシート。実際にアプリを再現するときに使われるのはこの厳密なレシートの方だと考えて良い

import { ExpoConfig } from "expo/config";

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
  path: [
    path.resolve(__dirname, ".env.local"),
    path.resolve(__dirname, ".env"),
  ],
  quiet: true,
});

const config: ExpoConfig = {
  name: "Hoshigo",
  slug: "Hoshigo",
  // 2026/10/02: 1.0.4 ▶︎ 1.0.5
  version: "1.0.5", // アプリのバージョン。必ずruntimeVersionと揃える。なお、Webでは-cでstartし直す必要あり
  orientation: "portrait",
  icon: "./assets/icons/icon.png", // 使われない
  scheme: "hoshigo",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.mokuyoubi.hoshigo",
    icon: "./assets/icons/Hoshigo.icon", // iosのアイコンとして使う
    associatedDomains: ["applinks:hoshigo.app"],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocalNetworkUsageDescription: "ローカルネットワークにアクセス",
      NSBonjourServices: ["_expo._tcp"],
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ["hoshigo"],
        },
      ],
    },
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#FFE5C9", // Androidのアイコンの背景色
      foregroundImage: "./assets/icons/icon-transparent.png", // Androidのアイコンとして使う
      monochromeImage: "./assets/icons/icon-transparent.png", // Androidのアイコンとして使う
    },

    predictiveBackGestureEnabled: false,
    package: "com.mokuyoubi.Hoshigo",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "hoshigo" }, { scheme: "exp" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  web: {
    output: "static",
    favicon: "./assets/icons/favicon.png", // Webのアイコンとして使う
    bundler: "metro",
  },

  plugins: [
    ["expo-router", { origin: "https://hoshigo.app" }],
    [
      "expo-splash-screen",
      {
        image: "./assets/icons/icon-transparent.png", // iOS/Android共通で、スプラッシュスクリーンに使う
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#000000",
      },
    ],
    "expo-secure-store",
    [
      "expo-audio",
      {
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    "expo-asset",
    "expo-localization",
    "expo-font",
    "expo-sqlite",
    "expo-web-browser",
    "expo-image",
    "expo-sharing",
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.4", // iOS16.4以上を要求
        },
        android: {
          minSdkVersion: 31, // Android12以上を要求
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  updates: {
    url: "https://u.expo.dev/0c034fcf-9b3f-4ae4-be56-052d71e47d52",
  },

  extra: {
    router: {},
    eas: {
      projectId: "0c034fcf-9b3f-4ae4-be56-052d71e47d52",
    },
  },
  // 2026/10/02: 1.0.4 ▶︎ 1.0,5
  runtimeVersion: "1.0.5", // 誰に対してOTAを配信するか。必ずversionと揃える。なお、Webでは-cでstartし直す必要あり
};

export default config;
