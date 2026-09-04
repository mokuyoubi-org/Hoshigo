# turnstile-widget

Cloudflare Turnstile(見えないチャレンジ)を、Web/Native両対応の1コンポーネントとして隠蔽するパッケージ。

呼び出し側は Turnstile の仕組み(Web版はスクリプト直埋め込み、Native版は非表示WebView経由)を一切知らなくてよく、
`ref.current.getToken()` を呼ぶだけでトークンが返ってくる。

## 使い方

```tsx
import { useRef } from "react";
import { TurnstileWidget, TurnstileHandle } from "turnstile-widget";

function SignInScreen() {
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleAnonymousSignIn = async () => {
    const token = await turnstileRef.current?.getToken();
    // token を Supabase の anonymous sign-in などに渡す
  };

  return (
    <>
      <TurnstileWidget ref={turnstileRef} sitekey={SITEKEY} />
      {/* ...ボタンなど... */}
    </>
  );
}
```

## API

### `<TurnstileWidget />`

| Prop      | 型       | 必須 | 説明                                                             |
| --------- | -------- | :--: | ---------------------------------------------------------------- |
| `sitekey` | `string` |  ✓   | Cloudflare Turnstileのsite key                                    |
| `action`  | `string` |      | チャレンジのaction名。省略時は `"anonymous_signin"`               |

### `TurnstileHandle`

```typescript
type TurnstileHandle = {
  getToken: () => Promise<string>;
};
```

- `getToken()` は呼び出しごとに新しいトークンを取得する(内部でreset→executeし直す)。
- 複数箇所から同時に呼ばれても内部キューで直列化されるため、呼び出し側は競合を気にしなくてよい。
- ウィジェットの準備待ち(最大10秒)・トークン取得のタイムアウト(15秒)・エラー時のreject は全て内部で処理される。

## プラットフォーム差分(呼び出し側は気にしなくてOK)

- **Web** (`TurnstileWidget.web.tsx`): Turnstileのスクリプトタグを直接読み込み、非表示(`appearance: "interaction-only"`)のウィジェットを常時マウント。
- **Native** (`TurnstileWidget.native.tsx`): `react-native-webview` 上に最小HTMLを読み込み、`postMessage` でトークンをRN側にブリッジ。

## 依存

- `react-native-webview` (Native版のみ使用。peerDependency)

## 既知の制約

- `sitekey` / `action` を動的に変更した場合の再レンダリング挙動は未検証(現状は起動時に固定値を渡す想定)。