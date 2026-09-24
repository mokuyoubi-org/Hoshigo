// (debug)/DebugScreen.tsx
// デバッグしたいコンポーネント用のページ。
import { CountryModal } from "@/src/active/components/modals/CountryModal";
import React from "react";
import { View } from "react-native";

export default function DebugScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-background p-4">
      {/* ここに検証したいコンポーネントを配置し、DebugScreenにアクセス */}

      {/* <GameResultModal
        boardSize={9}
        visible={true}
        resultComment="konchikuwa"
        onClose={() => {}}
        ratingBefore={10}
        ratingAfter={40}
        rankIndexBefore={0}
        rankIndexAfter={0}
        from={"GameScreen"}
        giantKillingStreak={3}
        giantKillingStreakBonusApplied={false}
      /> */}

      {/* <CountryModal onSelectCountry={() => {}} onClose={() => {}} /> */}
    </View>
  );
}
