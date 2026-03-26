import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: process.env.EXPO_PUBLIC_NAME!,
  slug: process.env.EXPO_PUBLIC_SLUG!,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: process.env.EXPO_PUBLIC_SCHEME!,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER!,
    icon: {
      dark: "./assets/icons/ios-dark.png",
      light: "./assets/icons/ios-light.png",
      tinted: "./assets/icons/ios-tinted.png",
    },
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/icons/adaptive-icon.png",
      monochromeImage: "./assets/icons/adaptive-icon.png",
    },

    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: process.env.ANDROID_PACKAGE_NAME!,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: process.env.EXPO_PUBLIC_SCHEME! }, { scheme: "exp" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },

  plugins: [
    ["expo-router", { origin: process.env.EXPO_PUBLIC_HOSHIGO_APP_URL! }],
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
    ["expo-web-browser", { experimentalLauncherActivity: false }],
    "expo-asset",
    "expo-localization",
    "expo-font",
    "expo-iap",
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  updates: {
    url: process.env.EXPO_UPDATES_URL!,
  },

  extra: {
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID!,
    },
  },

  assetBundlePatterns: ["assets/images/*"],

  runtimeVersion: {
    policy: "appVersion",
  },
};

export default config;
