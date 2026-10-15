// src/app/+native-intent.tsx

// アプリがブラウザなどから呼び起こされたとき、expo-routerが「どの画面を開くか」を
// 決める前に、道案内を見られる場所。
// 今は、Googleログインから戻ってきたときの動きを確認するためのログだけ置いている。
// (Androidでは、ログインから戻るときにアプリが起動し直されることがある。
//  その場合の復帰は、AuthGateが userId の変化を見て行っている)

export const redirectSystemPath = ({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string => {
  // cookieなどの認証情報がURLに含まれても、ログには出さない
  const safePath = path.replace(/cookie=[^&]*/, "cookie=***");
  console.log("🔗 native-intent:", { path: safePath, initial });

  return path;
};
