# expo-katago

Expo(React Native)アプリで、KataGoのGo AI解析をWebView経由で使うためのhook。

## セットアップ(アプリ全体で1回だけ)

Providerツリーの上の方で:

\`\`\`tsx
import { KataGoGate } from "expo-katago";

<KataGoGate>
  {/* アプリ本体 */}
</KataGoGate>
\`\`\`

準備中はローディング画面、失敗時はエラー画面が自動で出る。

## 使い方

\`\`\`tsx
import { useKataGo } from "expo-katago";

const kataGo = useKataGo();
const result = await kataGo.run({ board, moves, currentPlayer, boardSize, modelId });

if (result) {
  result.moves[0];   // 最善手候補
  result.ownership;  // 地合い判定(-1〜1)
}
\`\`\`

`result`はエンジン未準備・タイムアウト時に`null`になるので必ずチェックする。

## 座標系について
呼び出し元アプリ独自の盤面表現には一切関知しない。渡す/受け取るのは常に`Board2D`/`MoveObject`/`AnalyzeResult`の形。