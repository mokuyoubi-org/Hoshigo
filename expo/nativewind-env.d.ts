// nativewind-env.d.ts
// ts先生(型チェック係)への連絡メモ。NativeWind用。
// (expo-env.d.ts のNativeWind版。仕組みは同じ)

// 意味: 「NativeWind用の型の説明書(nativewind/types)も、一緒に読んでね」。
// これがないと、ts先生が「className? そんなpropないよ!」と怒ってしまう。
/// <reference types="nativewind/types" />