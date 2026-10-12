/**
 * GuestNoticeCard.tsx
 * プロフィール画面の、未ログインの際に表示される、「14日で削除されますよ」のやつ。
 * タップされたら onPress を呼ぶだけ。何が起きるか（モーダルを開く等）は親が決める。
 */

import { MyText } from "@/src/components/common/MyText";
import React from "react";
import { TouchableOpacity, View } from "react-native";

type Props = {
  description: string;
  onPress: () => void;
};

export const GuestNoticeCard = ({ description, onPress }: Props) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View className="bg-foreground rounded-3xl border-2 border-backgroundStrong p-5">
        <MyText className="text-sm text-textSub leading-5">
          {description}
        </MyText>
      </View>
    </TouchableOpacity>
  );
};
