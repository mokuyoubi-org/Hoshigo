// RuleItem.tsx

import { MyText } from "@/src/components/common/MyText";
import React from "react";
import { TouchableOpacity, View } from "react-native";

export type RuleSection = {
  subtitle?: string;
  description?: string;
};

type Props = {
  title: string;
  // 単発で使いたいとき用のオプショナル（過去の互換用）
  description?: string;
  // サブタイトルと説明のセットを配列で渡せるようにする
  sections?: RuleSection[];
  children?: React.ReactNode;
};

export const RuleItem = ({ title, description, sections, children }: Props) => {
  return (
    <TouchableOpacity
      activeOpacity={1}
      className="flex-row mb-4 items-start w-full"
    >
      {/* 左側のドットアイコン */}
      <View className="w-2 h-2 rounded-full mt-2.5 mr-2 bg-text" />
      <View className="flex-1">
        {/* 大タイトル */}
        <MyText className="text-lg text-text mb-1">{title}</MyText>

        {/* 単体の description が渡されている場合の表示（後方互換） */}
        {description && (
          <MyText className="text-base text-text mr-2 mb-2">
            {description}
          </MyText>
        )}

        {/* 配列で渡されたサブタイトルと説明のループ処理 */}
        {sections &&
          sections.map((sec, index) => (
            <View key={index} className="mb-3">
              {sec.subtitle && (
                <MyText className="text-base text-text mb-0.5 bg-background">
                  {sec.subtitle}
                </MyText>
              )}
              {sec.description && (
                <MyText className="text-base text-text mr-2">
                  {sec.description}
                </MyText>
              )}
            </View>
          ))}

        {children}
      </View>
    </TouchableOpacity>
  );
};
