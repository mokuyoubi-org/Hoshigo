# ui-atoms

親アプリのデザイントークン（`COLORS`など）に依存しない、汎用的なUIパーツ集です。
色は全て呼び出し側から`props`で渡すか、パーツ内部にhexで直接埋め込んであります。
NativeWindは使わず、`StyleSheet.create`のみで組んでいます。

---

## IconButton

丸いアイコンボタン。サイズ(42×42px)は固定、アイコンと色だけ呼び出し側が指定します。

```tsx
import { IconButton } from "ui-atoms";
import { Ionicons } from "@expo/vector-icons";

<IconButton
  icon={<Ionicons name="close" />}
  color="#4e5256"
  onPress={handleClose}
/>;
```

- `icon`：`size`と`color`を受け取れるアイコン要素（`@expo/vector-icons`など）を渡してください。内部で`size={20}`・指定した`color`が自動的に注入されます。
- `color`：アイコンの色。
- それ以外は`TouchableOpacityProps`をそのまま受け付けます（`onPress`、`disabled`など）。
- `style`を渡すと、内部の既定スタイルにマージされます。

---

## ToggleSwitch

ON/OFFを切り替えるスイッチ。状態変化はアニメーションでなめらかに切り替わります。

```tsx
import { ToggleSwitch } from "ui-atoms";

<ToggleSwitch
  value={allowBotMatch}
  onToggle={setAllowBotMatch}
  disabled={isMatching}
/>;
```

- `value`：現在のON/OFF状態。
- `onToggle`：タップされた時に呼ばれる関数。新しい値(`boolean`)が渡されます。
- `disabled`：省略可。`true`の間はタップを受け付けず、見た目も薄くなります。

⚠️ トラックやつまみのサイズを変更する場合、内部の`KNOB_TRANSLATE_X`（つまみの移動距離）を手計算し直す必要があります。

---

## SegmentedControl

複数の選択肢から1つを選ぶ、セグメント式のトグルです。`string`・`number`どちらの値でも使えます。

```tsx
import { SegmentedControl } from "ui-atoms";

<SegmentedControl
  value={boardSize}
  options={[
    { value: 9, label: "9x9" },
    { value: 13, label: "13x13" },
  ]}
  onSelect={setBoardSize}
/>;
```

- `value`：現在選ばれている値。
- `options`：選択肢の配列。それぞれ`value`と表示用の`label`を持ちます。
- `onSelect`：選択肢がタップされた時に呼ばれる関数。選ばれた`value`が渡されます。

---

## 共通方針

- 色は全てこのパッケージ内で完結（親アプリの`COLORS`は参照しません）。デザインを変えたい場合は各コンポーネント内の`StyleSheet`を直接編集してください。
- `Animated`を使う場合は`useRef(new Animated.Value(...)).current`ではなく`useAnimatedValue(...)`を使うこと（`react-hooks/refs`ルールでレンダー中の`ref.current`アクセスが禁止されているため）。
