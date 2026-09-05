const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withRemoveForegroundServicePermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // "tools" という特殊な呪文を使うための宣言
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    // 既存のFOREGROUND_SERVICE_MEDIA_PLAYBACKをいったん除去
    manifest["uses-permission"] = (manifest["uses-permission"] || []).filter(
      (p) => p.$["android:name"] !== "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
    );

    // 「どこから追加されようと消せ」という上書き命令を追加
    manifest["uses-permission"].push({
      $: {
        "android:name": "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "tools:node": "remove",
      },
    });

    return config;
  });
};