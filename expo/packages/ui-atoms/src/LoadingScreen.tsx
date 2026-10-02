// LoadingScreen.tsx

import React from "react";
import { ColorValue, Text, View } from "react-native";
import { ProgressBar } from "./ProgressBar";

type LoadingScreenProps = {
  label: React.ReactNode; // ⚠️2026/10/01: stringではないのはDotAnimationを受け入れるため
  percent: number | null; // null = 不確定バー
  backgroundColor: ColorValue;
  textColor: ColorValue;
  trackColor: ColorValue;
  fillColor: ColorValue;
  fontFamily: string; // 文字のフォント(省略時はシステムのフォント)
};

export function LoadingScreen({
  label,
  percent,
  backgroundColor,
  trackColor,
  fillColor,
  textColor,
  fontFamily,
}: LoadingScreenProps) {
  const fontStyle = fontFamily ? { fontFamily } : null;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor,
      }}
    >
      <Text
        style={[
          { marginBottom: 15, fontSize: 14, color: textColor },
          fontStyle,
        ]}
      >
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
          <Text style={[{ fontSize: 12, color: textColor }, fontStyle]}>
            {percent}%
          </Text>
        )}
      </View>
    </View>
  );
}
