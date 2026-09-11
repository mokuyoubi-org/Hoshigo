// app.config.ts
// アプリの設計図。

import { ExpoConfig } from "expo/config";

import * as dotenv from "dotenv";
import * as path from "path";
import withRemoveForegroundServicePermission from "./plugins/withRemoveForegroundServicePermission";

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
  version: "1.0.1", // 🌟
  orientation: "portrait",
  icon: "./assets/icons/icon.png",
  scheme: "hoshigo",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.mokuyoubi.hoshigo",
    icon: {
      dark: "./assets/icons/ios-dark.png",
      light: "./assets/icons/ios-light.png",
      tinted: "./assets/icons/ios-tinted.png",
    },
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
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/icons/adaptive-icon.png",
      monochromeImage: "./assets/icons/adaptive-icon.png",
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
    favicon: "./assets/icons/favicon.png",
    bundler: "metro",
  },

  plugins: [
    ["expo-router", { origin: "https://hoshigo.app" }],
    [
      "expo-splash-screen",
      {
        image: "./assets/icons/splash-icon-light.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
          image: "./assets/icons/splash-icon-dark.png",
        },
      },
    ],
    "expo-secure-store",
    "expo-audio",
    "expo-asset",
    "expo-localization",
    "expo-font",
    "expo-sqlite",
    "expo-web-browser",
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
    withRemoveForegroundServicePermission as any,
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

  assetBundlePatterns: ["assets/images/*"],

  runtimeVersion: "1.0.0", // 誰に対してotaを配信するか。
};

export default config;
