// // https://docs.expo.dev/guides/using-eslint/
// const { defineConfig } = require("eslint/config");
// const expoConfig = require("eslint-config-expo/flat");
// const reactNative = require("eslint-plugin-react-native");

// // 🛡️ 「外の世界」への import を禁止するパターン(全パッケージ共通)
// const OUTSIDE_IMPORT_PATTERNS = [
//   "@",
//   "@/*",
//   "@/**",
//   "../../*",
//   "../../../*",
//   "../../../../*",
// ];

// // 🛡️ packages配下の各パッケージが、親アプリのコードをimportできないようにする設定を
// //    パッケージ名から自動生成する。新しいpackagesを増やしたら、この配列に名前を足すだけでOK。
// const SANDBOXED_PACKAGES = [
//   "expo-katago",
//   "expo-goband",
//   "modal-shell",
//   "turnstile-widget",
//   "ui-atoms",
//   "i18n-kit",
//   "supabase-toolkit",
//   "react-overlay",
// ];

// const packageSandboxConfigs = SANDBOXED_PACKAGES.map((pkgName) => ({
//   files: [`**/packages/${pkgName}/src/**/*`],
//   rules: {
//     "no-restricted-imports": [
//       "error",
//       {
//         patterns: [
//           {
//             group: OUTSIDE_IMPORT_PATTERNS,
//             message: `${pkgName}の中から親アプリのコードをimportしてはいけない`,
//           },
//         ],
//       },
//     ],
//   },
// }));

// module.exports = defineConfig([
//   expoConfig,
//   {
//     plugins: {
//       "react-native": reactNative,
//     },
//     rules: {
//       "react-native/no-unused-styles": "warn",
//       "react-hooks/exhaustive-deps": "off",
//     },
//   },

//   ...packageSandboxConfigs,

//   // 🛡️ アプリ側から packages/* の中身を深い相対パスで直接importするのを禁止する
//   //    (これをやると npm install/workspaces を経由せず内部実装に直結してしまい、
//   //     「パッケージ名でしか呼べない」という黒箱化の意味がなくなるため)
//   {
//     ignores: ["**/packages/**/*"],
//     rules: {
//       "no-restricted-imports": [
//         "error",
//         {
//           patterns: [
//             {
//               group: ["**/packages/*/src/**", "**/packages/*/src/*"],
//               message:
//                 'packages配下は相対パスで直接importせず、パッケージ名(例: "modal-shell")でimportしてください',
//             },
//           ],
//         },
//       ],
//     },
//   },

//   {
//     ignores: ["dist/*"],
//   },
// ]);
