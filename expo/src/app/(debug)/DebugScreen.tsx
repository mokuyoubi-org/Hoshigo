// (debug)/DebugScreen.tsx
// デバッグしたいコンポーネント用のページ。
import { LoginModal } from "@/src/active/components/modals/LoginModal";
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
        giantKillingBonus={false}
      /> */}
      {/* <VersionModal onClose={()=>{}}/> */}
      {/* <UpdateModal kind="reload" /> */}
      {/* <LogoutModal onCancel={()=>{}}  onConfirm={()=>{}} /> */}
      {/* <LoadingModal /> */}
      <LoginModal visible={true} onClose={() => {}} />
      {/* <GameStartModal
        blackPlayer={{ ratingOrRank: 0, username: "", iconIndex: 0 }}
        whitePlayer={{ ratingOrRank: 0, username: "", iconIndex: 0 }}
        matchType={0}
        onClose={() => {}}
      /> */}
      {/* <CountryModal onSelectCountry={() => {}} onClose={() => {}} /> */}
    </View>
  );
}
