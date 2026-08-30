import React from "react";
import { Text, View } from "react-native";

type Props = {
  count: number;
  stoneSize?: number; // 将来的に使う場合のために残す
};

export function AgehamaDisplay({ count }: Props) {
  return (
    <View
      className={`bg-backgroundDark px-[6px] py-[1px] rounded-[8px] ${
        count === 0 ? "opacity-25" : ""
      }`}
    >
      <Text className="color-textSub text-[11px] font-medium tracking-[0.3px]">
        +{count}
      </Text>
    </View>
  );
}
