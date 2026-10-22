// src/hooks/common/useUpdateModalKind.ts

import { useApp } from "@/src/contexts/AppContexts";
import { Platform } from "react-native";

// updateReasonとPlatform.OSから、出すべきモーダルの種類を決める。
// web: appでもotaでも「リロードして」の一種類
// native: app不足→ストア誘導、ota不足→再起動誘導
export const useUpdateModalKind = () => {
  const { updateReason } = useApp();

  if (updateReason === null) {
    return null;
  }

  if (Platform.OS === "web") {
    return "reload" as const;
  }

  return updateReason === "app" ? ("store" as const) : ("restart" as const);
};