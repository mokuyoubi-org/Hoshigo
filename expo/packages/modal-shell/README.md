# ModalShell 子モーダル実装ガイド

ModalShellが持つのは「見た目(色・枠・角丸・アニメーション・サイズ上限)」だけです。
中身の配置は、子モーダル自身が普通のReact Nativeコンポーネントとして書けば
そのまま動きます。特別な作法はほぼありません。

---

## サイズ：`size` プロパティで幅の上限を選ぶ

| size | 幅の上限 | 用途の目安                               |
| :--- | :------- | :---------------------------------------- |
| `sm` | 360px    | 確認ダイアログ・警報・シンプル入力        |
| `md` | 480px    | 標準モーダル（デフォルト）                |
| `lg` | 680px    | ルール説明・ランキング・長文スクロール系  |

高さの上限は`size`に関わらず**画面高さの85%**で共通です（サイズごとに変えていません。
高さは「デザインの意図」ではなく「画面からはみ出さないための安全装置」だからです）。
中身が短ければその分だけ縮むので、smモーダルが無駄に大きくなることはありません。

**`className`で幅・高さを直接指定するのは禁止**です。既定サイズで収まらない場合は、
まず`size`のプリセット自体を見直してください。どうしても一回限りの例外が必要な場合のみ
`style={{ width: 500 }}`のように`style`で上書きしてください（`className`はShellの内部計算
と衝突する可能性があります）。

---

## 中央に寄せたい時だけ `self-center` を足す

ModalShellの中身は、RN標準どおり**幅いっぱいに伸びる(stretch)**のがデフォルトです。
「固定サイズの内容を中央に置きたい」場合だけ、自分で寄せてください。

```tsx
// 幅いっぱいに広げたい内容（見出し・本文など）→ 何もしなくてOK
<ModalShell>
  <Text className="text-lg font-bold">タイトル</Text>
</ModalShell>

// 固定サイズの内容を中央に置きたい場合 → self-center を足す
<ModalShell size="sm">
  <View className="w-[200px] h-[140px] items-center self-center">
    <ActivityIndicator />
  </View>
</ModalShell>
```

## スクロールしたい時

**モーダル全体をスクロールさせたい場合**は、いつも通り`flex-1`のScrollViewを書くだけです。

```tsx
<ModalShell size="lg">
  <ScrollView className="w-full flex-1">
    <Text>長い内容...</Text>
  </ScrollView>
</ModalShell>
```

**タイトルなど固定要素の下にScrollViewを置く場合**は、`flex-1`だと破綻するので、
ScrollViewに明示的な高さを与えてください（`useWindowDimensions`ベースでも固定値でもOK）。

```tsx
<ModalShell onClose={onClose} size="lg">
  <View className="w-full pb-3">
    <Text className="text-xl font-bold">タイトル</Text>
  </View>

  <ScrollView style={{ height: windowHeight * 0.35 }} className="w-full">
    <Text>長い内容...</Text>
  </ScrollView>
</ModalShell>
```

⚠️ スクロールしたい要素は、押す必要がなくても`TouchableOpacity`などタップ可能な
コンポーネントにしてください。そうしないと反応せず、スクロールができません。

### 高さの目安

Shellの`maxHeight`は画面高さの85%が上限です。ScrollViewなどに明示的な高さを
指定する場合、うっかりこれに近い値（80%など）を設定すると、タイトルやpadding分の
余白がなくなってモーダルが画面からはみ出す・詰まって見えることがあります。
目安として、ScrollView自体の高さは**画面高さの60%程度まで**に収めておくと安全です。

---

## テンプレート

```tsx
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ModalShell } from "./shell/ModalShell";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ExampleModal({ visible, onClose }: Props) {
  if (!visible) return null;

  return (
    <ModalShell onClose={onClose} size="lg">
      <View className="w-full pb-3">
        <Text className="text-xl font-bold">タイトル</Text>
      </View>

      <ScrollView className="w-full flex-1">
        <Text>コンテンツエリア</Text>
      </ScrollView>
    </ModalShell>
  );
}
```