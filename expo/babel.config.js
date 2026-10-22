// babel.config.js
// Babelくんへの指示書。
// Babelくんは「コードを別のコードに書き換える職人」で、
// Metroくんに頼まれて、ts/tsxなどを実行できるJSに書き換える。
//
// ※なお、このjsファイルは、tsには変更不可。
// なぜjsで書くのか:
// Babelくんがtsを読めるようになるには、道具(presets)が必要。
// その道具の準備が書いてあるのが、このファイル。
// つまり、このファイルを読んでいる時点では、Babelくんはまだtsを読めない。
// (道具を準備したあとで、はじめてts/tsxを読めるようになる)

module.exports = (api) => {
  // この設定は変わらないので、結果を使い回していいよ、という宣言。
  // 毎回読み直さなくなるので速くなる。
  api.cache(true);

  return {
    // presets = 書き換えルールの「詰め合わせセット」。
    presets: [
      // Expo標準の詰め合わせ。
      // 型を消す、JSXを変換する、Fast Refreshの目印を入れる、などをまとめてやってくれる。
      // jsxImportSource: "nativewind" は、
      // 「JSXを変換するとき、NativeWindの関数を使ってね」という指定。
      // これで className="..." がReact Nativeの部品に効くようになる。
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],

      // NativeWind用の追加ルール詰め合わせ。
      "nativewind/babel",
    ],

    // env = 環境ごとの設定。
    env: {
      // 本番ビルドのときだけ適用される。
      production: {
        // transform-remove-console は、コード中のconsole.log等を消す。
        // exclude に書いた error と warn は、消さずに残す。
        // (本番でトラブルが起きたとき、adb logcat で原因を読めるようにするため)
        plugins: [["transform-remove-console", { exclude: ["error", "warn"] }]],
      },
    },
  };
};