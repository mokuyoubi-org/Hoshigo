// index.tsx
// ルートの_layout.tsxの<Slot/>の中に最初にはめ込まれている、初期値的な画面。何も映さない、白画面。
// layout内が<外側>から<内側>の順で実行されていき、ここに行き着くと、今度は逆順つまり<内側>から<外側>の順でuseEffectが発火していくみたい。
export default function Index() {
  return null;
}
