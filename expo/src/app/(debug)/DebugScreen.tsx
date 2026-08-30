// (debug)/DebugScreen.tsx
// デバッグしたいコンポーネント用のページ。
// import LoadingModal from "@/src/active/components/modals/LoadingModal";
// import { GameResultModal } from "@/src/active/components/modals/GameResultModal";
// import { GameStartModal } from "@/src/active/components/modals/GameStartModal";
// import { MaintenanceModal } from "@/src/active/components/modals/MaintenanceModal";
// import { LoginModal } from "@/src/active/components/modals/LoginModal";
import React from "react";
import { View } from "react-native";

export default function DebugScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-background p-4">
      {/* ここに検証したいコンポーネントを配置し、DebugScreenにアクセス */}
      {/* <LoadingModal text={"a"} visible={true} /> */}

      {/* <GameResultModal
        boardSize={9}
        visible={true}
        resultComment={"a"}
        onClose={() => {}}
        pointsBefore={0}
        pointsAfter={10}
        rankIndexBefore={0}
        rankIndexAfter={0}
        newlyAcquiredIcons={[]}
      /> */}

      {/* <GameStartModal
              myUsername={"abc"}
              myIconIndex={ 0}
              myRankIndex={ 0}
              myColor={ 1}
              oppUsername={""}
              oppIconIndex={ 0}
              oppPoints={ 0}
              oppColor={2}
              matchType={3}
              onClose={()=>{}}
            /> */}
      {/* <MaintenanceModal message={"abd"} /> */}

      {/* <LoginModal visible={true} onClose={() => {}} /> */}
    </View>
  );
}
