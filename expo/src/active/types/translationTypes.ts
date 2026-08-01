// @/src/active/types/translation.ts

import { dictionary } from "../constants/dictionary";

// 🟨ここに"jp"など追加可能。
export type Lang = "en";

/*
考えやすくするための例: 
 export const dictionary = {
  common: {
    en: {
      ok: "OK",
      ng: "NG"
      ...
    },
    ...
  },
  home: {
    en: {
      hello: "Hello",
      ...
    },
    ...
  },
  ...
  } as const;
💡理屈:
  keyof はtypeにしか使えない(keyofを使うためにtypeofを使っていると考えて良い)。
  keyofはループを行い、上の|...|...を得る。
*/
// 🟩export type Section = "common" | "home" | ...
// と考えるとわかりやすい。
export type Section = keyof typeof dictionary;

/* 
💡理屈:
  keyofとinはforループ的なことをしている。typeofはkeyofを使うためのものだという風に捉え、深く考えなくていい。
  まず、Sはcommonだとして、[common][en]をすると、ok: OK, ng: NGなどが得られるが、ここからkeyofをすることでそのkeyのみ、つまりok | ngが得られる。
  同じことをSがhomeの時も行う。
  すると、辞書部分は最終的に
  type TranslationKey = {
    common: "common.ok" | "common.ng";
    home:   "home.hello";
  };
  このようになる。
  ここで最後に[Section]を行うと、
  type TranslationKey = "common.ok" | "common.ng" | "home.hello";
  このようになるのだ。
*/
// 🟩export type TranslationKey = "common.ok" | "common.ng" | "home.hello" | ...
// と考えるとわかりやすい。
export type TranslationKey = {
  [S in Section]: `${S}.${keyof (typeof dictionary)[S]["en"] & string}`;
}[Section];
