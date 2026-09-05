// src/active/components/ui/LoadingScreen.tsx

import React from "react";
import { Text, View } from "react-native";
import { ProgressBar } from "./ProgressBar";

type Props = {
  label: string;
  percent: number | null; // null = 不確定バー
  backgroundColor?: string;
};

export function LoadingScreen({
  label,
  percent,
  backgroundColor = "white",
}: Props) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor,
      }}
    >
      <Text style={{ marginBottom: 15, fontSize: 14, color: "#4e5256" }}>
        {label}
      </Text>

      <ProgressBar percent={percent} />

      {/* %の有無に関わらず高さを固定で確保。DLの時だけ帯下に文字が出て
          UIが伸び縮みするジャンプを防ぐための「空箱」 */}
      <View style={{ height: 18, justifyContent: "center", marginTop: 6 }}>
        {percent !== null && (
          <Text style={{ fontSize: 12, color: "#4e5256" }}>{percent}%</Text>
        )}
      </View>
    </View>
  );
}