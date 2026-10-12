// eslint.config.ts
import { defineConfig, globalIgnores } from "eslint/config";
// @ts-expect-error eslint-config-expo has no type declarations
import expoConfig from "eslint-config-expo/flat";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";

export default defineConfig([
  globalIgnores(["android/", "ios/", "dist/", ".expo/", "node_modules/"]),
  expoConfig,
  {
    plugins: {
      "prefer-arrow-functions": preferArrowFunctions,
    },
    rules: {
      "prefer-arrow-functions/prefer-arrow-functions": "error",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react/display-name": "off",
      "react-hooks/exhaustive-deps": "off", // 依存配列系の警告はうるさいのでoffに
    },
  },
]);
