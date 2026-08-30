# i18n-kit

辞書オブジェクトを渡すと、Provider・言語切り替えhook・翻訳hookを
組み立てて返してくれる工場関数。辞書の中身(実際の文言)は一切持たない。

## 使い方

```ts
// アプリ側: src/active/i18n.ts
import { createI18n } from "i18n-kit";
import { dictionary } from "./constants/dictionary";

export const { LangProvider, useLang, useTranslation } = createI18n(dictionary);
```

```tsx
// セットアップ
<LangProvider>{children}</LangProvider>
```

```ts
// 使う側
const t = useTranslation();
t("common.ok"); // dictionary.common[lang].ok を返す。無ければ .en にフォールバック
```

辞書の形は `{ セクション: { 言語コード: { キー: 文言 } } }`。
`TranslationKey`型(`"common.ok"`のような文字列)は辞書の形から自動で導出されるので、
別途手で書く必要はない。