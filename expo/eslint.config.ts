// eslint.config.ts
// ESLintさん(コードの書き方にうるさい校閲さん)への指示書。
// ts先生が「型の間違い」を探すのに対して、ESLintさんは「怪しい書き方・流儀違反」を探す。
// ESLintさんもts先生同様、検査するだけ。

// 設定を書くための道具。
import { defineConfig, globalIgnores } from "eslint/config";

// Expo公式の、ルールブック詰め合わせ。(babel-preset-expo の仲間)
// ↓ ts先生への一言: 「このライブラリは型定義がなくて怒られるけど、承知の上だから黙っててね。」
// @ts-expect-error eslint-config-expo has no type declarations
import expoConfig from "eslint-config-expo/flat";

// 「関数はアロー関数で書いてね」というルールを足すための、追加プラグイン。
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";

export default defineConfig([
  // 「このフォルダは見なくていいよ」のリスト。
  // 自分で書いていない(自動生成・ビルド結果・買ってきた商品)コードまで怒っても意味がないので除外。
  globalIgnores(["android/", "ios/", "dist/", ".expo/", "node_modules/"]),

  // まず、Expo標準のルールブックを丸ごと採用する。
  expoConfig,

  // ここから、自分独自の追加ルール。
  {
    // 追加プラグインを登録する(使うルールの「名前」を使えるようにする)。
    plugins: {
      "prefer-arrow-functions": preferArrowFunctions,
    },

    // ルールごとの厳しさ。
    // "error" = 🔴 直すまで怒る / "warn" = 🟡 指摘するけど続行OK / "off" = ⚪ 何も言わない
    rules: {
      // function foo() {} ではなく、const foo = () => {} で書かないとエラー。
      "prefer-arrow-functions/prefer-arrow-functions": "error",

      // hooksまわりの、新しめの厳しいチェック。警告止まりで有効にしている。
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      // コンポーネントの名前付けチェックは無効。
      "react/display-name": "off",

      // useEffect等の依存配列の警告は、うるさいのでoffに。
      // ※「古い値のままになってる?」という不具合が出たら、まずここを疑う。
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);