// i8n-kit/src/types.ts

export type Dictionary = Record<string, Record<string, Record<string, any>>>;

export type SectionOf<D extends Dictionary> = keyof D & string;
export type LangOf<D extends Dictionary> = keyof D[SectionOf<D>] & string;
export type TranslationKeyOf<D extends Dictionary> = {
  [S in SectionOf<D>]: `${S}.${keyof D[S][LangOf<D>] & string}`;
}[SectionOf<D>];