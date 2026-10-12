// babel.config.js
// tsに変更不可みたい。

module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    env: {
      production: {
        plugins: ["transform-remove-console"],
      },
    },
  };
};