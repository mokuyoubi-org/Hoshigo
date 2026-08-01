// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const reactNative = require("eslint-plugin-react-native");

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      "react-native": reactNative,
    },
    rules: {
      "react-native/no-unused-styles": "warn",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    ignores: ["dist/*"],
  },
]);
