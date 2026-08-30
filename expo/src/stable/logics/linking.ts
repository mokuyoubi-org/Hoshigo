// linkings.ts

import { Linking } from "react-native";

export const openURL = (url: string): void => {
  Linking.openURL(url).catch((err) =>
    console.error("URLを開けませんでした:", err),
  );
};