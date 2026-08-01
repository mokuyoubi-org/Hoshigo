import { MainButton } from "@/src/active/components/buttons/MainButton";
import { NineThirteenButton } from "@/src/active/components/buttons/NineThirteenButton";
import { MaintenanceModal } from "@/src/active/components/common/MaintenanceScreen";
import { ConfirmModal } from "@/src/active/components/modals/ConfirmModal";
import RankingsModal from "@/src/active/components/modals/RankingsModal";
import { RuleModal } from "@/src/active/components/modals/RuleModal";
import { COLORS } from "@/src/active/constants/colors";
import { useApp } from "@/src/active/contexts/AppContexts";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { BoardSize } from "@/src/stable/types/goTypes";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { startMatching, isMatching } = useMatching();

  const [isInfoModalVisible, setIsModalVisible] = useState(false);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

  const [isRankingsModalVisible, setIsRankingsModalVisible] = useState(false);

  const { profile } = useProfile();
  const { uid, username } = profile;
  const { maintenance, maintenanceMessage } = useApp();

  const t = useTranslation();

  const [boardSize, setBoardSize] = useState<BoardSize>(9);

  const onMainbutton = () => {
    if (!uid || !username) {
      setIsLoginModalVisible(true);
      return;
    }
    startMatching(boardSize);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {maintenance && <MaintenanceModal message={maintenanceMessage} />}

      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <NineThirteenButton boardSize={boardSize} onToggle={setBoardSize} />

          <TouchableOpacity
            style={styles.infoButton}
            activeOpacity={0.7}
            onPress={() => setIsRankingsModalVisible(true)}
          >
            <AntDesign name="crown" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoButtonText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* メインボタン（マッチング中なら押せない） */}
        <MainButton
          onPress={onMainbutton}
          boardSize={boardSize}
          disabled={isMatching}
        />
      </View>

      <ConfirmModal
        visible={isLoginModalVisible}
        title={t("Home.loginRequired")}
        confirmText={t("common.login")}
        onConfirm={() => {
          setIsLoginModalVisible(false);
          router.push("/Login");
        }}
        onCancel={() => setIsLoginModalVisible(false)}
      />

      <RuleModal
        visible={isInfoModalVisible}
        onClose={() => setIsModalVisible(false)}
        colors={COLORS}
      />

      <RankingsModal
        visible={isRankingsModalVisible}
        onClose={() => setIsRankingsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  infoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    backgroundColor: COLORS.foreground,
    justifyContent: "center",
    alignItems: "center",
  },
  infoButtonText: {
    fontSize: 17,
    color: COLORS.textSub,
  },
});
