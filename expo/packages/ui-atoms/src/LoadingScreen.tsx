// LoadingScreen.tsx

import React from "react";
import { ColorValue, Text, View } from "react-native";
import { ProgressBar } from "./ProgressBar";

type LoadingScreenProps = {
  label: string;
  percent: number | null; // null = 不確定バー
  backgroundColor: ColorValue;
  textColor: ColorValue;
  trackColor: ColorValue;
  fillColor: ColorValue;
};

export function LoadingScreen({
  label,
  percent,
  backgroundColor,
  trackColor,
  fillColor,
  textColor,
}: LoadingScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor,
      }}
    >
      <Text style={{ marginBottom: 15, fontSize: 14, color: textColor }}>
        {label}
      </Text>

      <View style={{ width: 180 }}>
        <ProgressBar
          percent={percent}
          trackColor={trackColor}
          fillColor={fillColor}
        />
      </View>

      {/* %の有無に関わらず高さを固定で確保。DLの時だけ帯下に文字が出て
          UIが伸び縮みするジャンプを防ぐための「空箱」 */}
      <View style={{ height: 18, justifyContent: "center", marginTop: 6 }}>
        {percent !== null && (
          <Text style={{ fontSize: 12, color: textColor }}>{percent}%</Text>
        )}
      </View>
    </View>
  );
}
