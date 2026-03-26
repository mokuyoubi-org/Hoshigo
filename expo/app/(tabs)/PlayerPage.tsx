import { FloatingToggle } from "@/src/components/FloatingToggle";
import { Avatar } from "@/src/components/GoComponents/Avatar";
import GumiInfoModal from "@/src/components/Modals/GumiInfoModal";
import IconSelectorModal from "@/src/components/Modals/IconSelectModal";
import LoadingModal from "@/src/components/Modals/LoadingModal";
import LoginNeededModal from "@/src/components/Modals/LoginNeededModal";
import { BACKGROUND, CHOCOLATE, STRAWBERRY } from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import {
  DisplaynameContext,
  GumiIndexContext,
  IconIndexContext,
  PointsContext,
  UidContext,
  UsernameContext,
} from "@/src/contexts/UserContexts";
import { useTheme } from "@/src/hooks/useTheme";
import { calculateGumiProgress, getGumiByIndex } from "@/src/lib/gumiUtils";
import { pointsToWins } from "@/src/lib/utils";
import { supabase } from "@/src/services/supabase";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayerPage() {
  const { colors } = useTheme();
  const { t, lang } = useTranslation();

  // ── ロジック（変更なし） ──
  const { username, setUsername } = useContext(UsernameContext)!;
  const { displayname, setDisplayname } = useContext(DisplaynameContext)!;
  const { points, setPoints } = useContext(PointsContext)!;
  const { iconIndex, setIconIndex } = useContext(IconIndexContext)!;
  const { gumiIndex, setGumiIndex } = useContext(GumiIndexContext)!;
  const currentGumi = getGumiByIndex(gumiIndex || 0);
  const gumiColor =
    colors[currentGumi.color as keyof typeof colors] || colors.text;
  const uid = useContext(UidContext);

  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isIconSelectorVisible, setIsIconSelectorVisible] = useState(false);
  const [isGumiInfoVisible, setIsGumiInfoVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressInfo = calculateGumiProgress(points || 10, gumiIndex || 0, t);

  // ページを開いた時のゲージのアニメーション
  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: progressInfo.progressPercent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressInfo.progressPercent]);

  // 棋譜ボタンを押した時の処理
  const onRecords = () => {
    if (!uid || !username) {
      setIsLoginModalVisible(true);
    } else {
      router.push("/PlayerRecords");
    }
  };

  // アイコン画像を押した時の処理
  const handleSelectIcon = (iconIndex: number) => {
    if (setIconIndex === null) return;
    if (uid === null) {
      setIconIndex(iconIndex);
      return;
    }
    const updateIcon = async () => {
      setLoading(true);
      const { error } = await supabase.rpc("update_icon_index", {
        new_icon_index: iconIndex,
      });
      if (error) {
        console.error(error);
      } else {
        setIconIndex(iconIndex);
      }
      setLoading(false);
    };
    updateIcon();
  };

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const winsNeeded = pointsToWins(progressInfo.pointsNeeded);
  const winText = lang === "en" ? (winsNeeded === 1 ? "win" : "wins") : ""; // 他言語は空でOK

  const [boardSize, setBoardSize] = useState<number>(9);

  const handleToggle = (boardSize: number) => {
    setBoardSize(boardSize);
    if (boardSize === 9) {
      console.log("9路の処理"); // 9路の初期化など
    } else {
      console.log("13路の処理"); // 13路の初期化など
    }
  };
  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* ヘッダーバー */}
        <View style={styles.headerBar}>
          {/* <FloatingToggle boardSize={boardSize} onToggle={handleToggle} /> */}

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.7}
            onPress={() => router.push("/Settings")}
          >
            <FontAwesome6 name="gear" size={20} color={STRAWBERRY} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scrollContent}>
            {/* ─── アバター・名前エリア ─── */}
            <View style={styles.heroArea}>
              {/* アバター */}
              <TouchableOpacity
                onPress={() => setIsIconSelectorVisible(true)}
                activeOpacity={0.8}
                style={styles.avatarWrapper}
              >
                <Avatar
                  gumiIndex={gumiIndex ?? 0}
                  iconIndex={iconIndex ?? 0}
                  size={96}
                />

                {/* 編集バッジ */}
                <View style={styles.editBadge}>
                  <MaterialIcons name="edit" size={13} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {/* 名前 */}
              <Text style={styles.displayName}>
                {displayname || t("common.guest")}
              </Text>
              <Text style={styles.username}>@{username || "guest"}</Text>
            </View>

            {/* ─── くみカード ─── */}
            <View style={styles.gumiCard}>
              <View />
              <View style={styles.gumiCardInner}>
                {/* ラベル＋infoボタン */}
                <View style={styles.gumiLabelRow}>
                  <Text style={styles.gumiLabel}>{t("MyPage.youAre")}</Text>
                  <TouchableOpacity
                    onPress={() => setIsGumiInfoVisible(true)}
                    activeOpacity={0.6}
                    style={styles.infoButton}
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color={STRAWBERRY}
                    />
                  </TouchableOpacity>
                </View>

                {/* くみ名 */}
                <Text style={[styles.gumiName, { color: gumiColor }]}>
                  {currentGumi.name}
                </Text>

                {/* 進捗ゲージ */}
                {progressInfo.nextGumiName && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTextRow}>
                      <Text style={styles.progressNext}>
                        {progressInfo.nextGumiName} ▶︎
                      </Text>
                      <Text
                        style={[styles.progressPoints, { color: gumiColor }]}
                      >
                        {t("MyPage.remaining", {
                          wins: winsNeeded,
                          winText: winText,
                        })}
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      {/* 中身 */}
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          { backgroundColor: gumiColor, width: animatedWidth },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* 棋譜ボタン */}
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={onRecords}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrapper}>
                  <MaterialIcons name="history" size={18} color={STRAWBERRY} />
                </View>
                <Text style={styles.menuItemText}>{t("MyPage.myRecords")}</Text>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* モーダル類 */}
          <LoginNeededModal
            visible={isLoginModalVisible}
            onClose={() => setIsLoginModalVisible(false)}
            message={t("MyPage.recordsLoginRequired")}
          />
          <IconSelectorModal
            visible={isIconSelectorVisible}
            onClose={() => setIsIconSelectorVisible(false)}
            onSelectIcon={handleSelectIcon}
            currentIconIndex={iconIndex ?? 0}
          />
          <GumiInfoModal
            visible={isGumiInfoVisible}
            onClose={() => setIsGumiInfoVisible(false)}
            currentGumiIndex={gumiIndex || 0}
            currentPoints={points || 10}
          />
        </ScrollView>
      </View>

      <LoadingModal text={t("common.loading")} visible={loading} />
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
  },

  // 背景グリッド（優しい色に）
  bgLineV: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "rgba(200,214,230,0.08)",
  },
  bgLineH: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 1,
    backgroundColor: "rgba(200,214,230,0.08)",
  },

  // ヘッダーバー
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 14,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // スクロール
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 18,
  },

  // ─── ヒーローエリア ───
  heroArea: {
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  avatarWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: STRAWBERRY,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: BACKGROUND,
  },

  displayName: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 14,
    color: STRAWBERRY,
    letterSpacing: 1,
    fontWeight: "600",
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 6,
    backgroundColor: "rgba(200,214,230,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },

  // ─── くみカード ───
  gumiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
  },
  gumiCardInner: {
    padding: 28,
    alignItems: "center",
    backgroundColor: "rgba(249,250,251,0.5)",
  },
  gumiLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  gumiLabel: {
    fontSize: 11,
    color: STRAWBERRY,
    letterSpacing: 2,
    fontWeight: "700",
  },
  infoButton: {
    padding: 2,
  },
  gumiName: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 20,
  },

  // 進捗ゲージ
  progressContainer: {
    width: "100%",
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressNext: {
    fontSize: 12,
    color: STRAWBERRY,
    fontWeight: "600",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  progressPoints: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progressBarBg: {
    width: "100%",
    height: 24,
    borderRadius: 24,
    backgroundColor: "rgba(200,214,230,0.2)",
    overflow: "hidden",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 24,
  },
  progressBarGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 4,
    opacity: 0.3,
  },

  // ─── メニュー ───
  menuItem: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(200,214,230,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  menuItemArrow: {
    fontSize: 28,
    fontWeight: "300",
    color: STRAWBERRY,
    opacity: 0.5,
  },
});
