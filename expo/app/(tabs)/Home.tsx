import { FloatingToggle } from "@/src/components/FloatingToggle";
import { MainButton } from "@/src/components/home/MainButton";
import { MainTitle } from "@/src/components/home/MainTitle";
import { DailyLimitModal } from "@/src/components/Modals/DailyLimitModal";
import { InfoModal } from "@/src/components/Modals/InfoModal";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import LoginNeededModal from "@/src/components/Modals/LoginNeededModal";
import { MaintenanceModal } from "@/src/components/Modals/MaintenanceModal";
import { BACKGROUND, STRAWBERRY } from "@/src/constants/colors";
import {
  MaintenanceContext,
  MaintenanceMessageContext,
} from "@/src/contexts/AppContexts";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { UidContext, UsernameContext } from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { useStartMatching } from "@/src/lib/matchUtils";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── メイン ───────────────────────────────────────────
export default function Home() {
  const startMatching = useStartMatching();
  const [isInfoModalVisible, setIsModalVisible] = useState(false);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const uid = useContext(UidContext);
  // コンポーネント内
  const { username, setUsername } = useContext(UsernameContext)!;
  const { maintenance, setMaintenance } = useContext(MaintenanceContext)!;
  const { maintenanceMessage, setMaintenanceMessage } = useContext(
    MaintenanceMessageContext,
  )!;
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const { t, lang } = useTranslation();
  const onMainbutton = () => {
    if (!uid || !username) {
      setIsLoginModalVisible(true); // 未ログインのユーザ
      return;
    }
    startMatching(setLoading, setIsDailyLimitReached);
  };

  const [boardSize, setBoardSize] = useState<number>(9);

  const handleToggle = (boardSize: number) => {
    setBoardSize(boardSize);
    if (boardSize === 9) {
      console.log("9路の処理"); // 9路の初期化など
    } else {
      console.log("13路の処理"); // 13路の初期化など
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* 🆕 メンテナンスオーバーレイ（最前面） */}
      {maintenance && <MaintenanceModal message={maintenanceMessage} />}

      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          {/* <FloatingToggle boardSize={boardSize} onToggle={handleToggle} /> */}

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoButtonText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* タイトル */}
        <MainTitle />

        {/* メインボタン */}
        <MainButton onPress={onMainbutton} />
      </View>
      {/* ロード中 */}
      <LoadingModal text={t("common.loading")} visible={loading} />

      {/* 未ログインなら */}
      <LoginNeededModal
        visible={isLoginModalVisible}
        onClose={() => setIsLoginModalVisible(false)}
        message={t("Home.loginRequired")}
      />

      {/* 右上のはてなマーク */}
      <InfoModal
        visible={isInfoModalVisible}
        onClose={() => setIsModalVisible(false)}
        colors={colors}
      />

      {/* 対局数制限 */}
      <DailyLimitModal
        visible={isDailyLimitReached}
        onClose={() => setIsDailyLimitReached(false)}
        colors={colors}
        dailyLimit={10}
      />
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between", // ← これだけ！
    paddingTop: 8,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: STRAWBERRY,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoButtonText: {
    fontSize: 17,
    color: STRAWBERRY,
  },
});
