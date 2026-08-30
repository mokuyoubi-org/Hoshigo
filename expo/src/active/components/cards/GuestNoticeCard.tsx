/**
 * GuestNoticeCard.tsx
 * プロフィール画面の、未ログインの際に表示される、「30日で削除されますよ」のやつ。
 */

import React from "react";
import { Text, View } from "react-native";

interface GuestNoticeCardProps {
  title: string;
  description: string;
}

export function GuestNoticeCard({ title, description }: GuestNoticeCardProps) {
  return (
    <View className="bg-foreground rounded-3xl border-2 border-backgroundDark p-5 gap-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-base font-bold text-text flex-1">{title}</Text>
      </View>
      <Text className="text-xs text-text opacity-80 leading-5">
        {description}
      </Text>
    </View>
  );
}
