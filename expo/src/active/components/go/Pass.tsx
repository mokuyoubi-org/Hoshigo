import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  visible?: boolean;
  isLeft: boolean;
};

const TAIL_SIZE = 5;

export function Pass({ visible = true, isLeft }: Props) {
  const t = useTranslation();

  return (
    <View className={`self-start ${visible ? "opacity-100" : "opacity-0"}`}>
      {/* 吹き出し本体 */}
      <View className="bg-foreground border-[1.5px] border-primary rounded-[12px] px-[10px] py-[4px]">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit // ← ★文字が大きすぎるとき自動でフォントサイズを小さくする
          className="text-[11px] font-semibold color-text tracking-[0.4px]"
        >
          {t("common.pass")}
        </Text>
      </View>

      {/* しっぽの枠線 */}
      <View
        className={isLeft ? "ml-[10px]" : "self-end mr-[10px]"}
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: TAIL_SIZE,
          borderRightWidth: TAIL_SIZE,
          borderTopWidth: TAIL_SIZE,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: COLORS.primary,
        }}
      />

      {/* しっぽの塗りつぶし */}
      <View
        className={`absolute bottom-[1px] ${isLeft ? "left-[10px]" : "right-[10px]"}`}
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: TAIL_SIZE,
          borderRightWidth: TAIL_SIZE,
          borderTopWidth: TAIL_SIZE * 2,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: COLORS.foreground,
        }}
      />
    </View>
  );
}
