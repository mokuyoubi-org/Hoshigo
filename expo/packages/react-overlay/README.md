# react-overlay

任意のReact要素を画面上に浮かせて表示するための、最小限のオーバーレイ管理システム。
モーダル、トースト、確認ダイアログなど、「今何かを画面に重ねて出したい」という
用途全般に使える。中身(何を表示するか)には一切関知しない。

## セットアップ(アプリ全体で1回だけ)

```tsx
import { OverlayProvider } from "react-overlay";

<OverlayProvider>
  {/* アプリ本体 */}
</OverlayProvider>
```

## 使い方

```tsx
import { useOverlay } from "react-overlay";

const { show, hide } = useOverlay();

show(<MyModal onClose={hide} />);
```

`show`を呼ぶたびに表示内容は置き換わる(常に1つだけ表示される)。