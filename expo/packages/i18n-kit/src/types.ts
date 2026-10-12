// i18n-kit/src/types.ts
// 2026/10/11: 整理

export type Dictionary = Record<string, Record<string, Record<string, any>>>;

type SectionOf<D extends Dictionary> = keyof D & string;

// キー名は基準言語"en"から取る（"en"は翻訳が見つからないときの代替言語でもある）
export type TranslationKeyOf<D extends Dictionary> = {
  [S in SectionOf<D>]: `${S}.${keyof D[S]["en"] & string}`;
}[SectionOf<D>];
