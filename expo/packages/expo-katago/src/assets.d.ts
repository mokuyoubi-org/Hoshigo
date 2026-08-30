// packages/expo-katago/src/assets.d.ts

declare module "*.bin.gz" {
  const value: number; // expo-asset / Metro ではアセットは require/import すると number (ID) になる
  export default value;
}
