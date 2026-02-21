import GumiInfoModal from "@/src/components/GumiInfoModal";
import IconSelectorModal from "@/src/components/IconSelectModal";
import LoadingOverlay from "@/src/components/LoadingOverlay";
import LoginNeededModal from "@/src/components/LoginNeededModal";
import { StarBackground } from "@/src/components/StarBackGround";
import { ICONS } from "@/src/constants/icons";
import { supabase } from "@/src/services/supabase";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DisplayNameContext,
  GumiIndexContext,
  IconIndexContext,
  PointsContext,
  SetIconIndexContext,
  UidContext,
  UserNameContext,
} from "../../src/components/UserContexts";
import { useTheme } from "../../src/hooks/useTheme";
import { calculateGumiProgress, getGumiByIndex } from "../../src/lib/gumiUtils";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

export default function MyPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // ── ロジック（変更なし） ──
  const username = useContext(UserNameContext);
  const displayName = useContext(DisplayNameContext);
  const points = useContext(PointsContext);
  const iconIndex = useContext(IconIndexContext);
  const setIconIndex = useContext(SetIconIndexContext);
  const playersGumiIndex = useContext(GumiIndexContext);
  const uid = useContext(UidContext);

  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isIconSelectorVisible, setIsIconSelectorVisible] = useState(false);
  const [isGumiInfoVisible, setIsGumiInfoVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const currentGumi = getGumiByIndex(playersGumiIndex || 0);
  const gumiColor =
    colors[currentGumi.color as keyof typeof colors] || colors.text;
  const progressInfo = calculateGumiProgress(
    points || 0,
    playersGumiIndex || 0,
  );

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    console.log("🔍 MyPage values:", {
      points,
      playersGumiIndex,
      progressPercent: progressInfo.progressPercent,
      pointsNeeded: progressInfo.pointsNeeded,
    });
  }, [points, playersGumiIndex, progressInfo]);

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: progressInfo.progressPercent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressInfo.progressPercent]);

  const onRecords = () => {
    if (!uid) {
      setIsLoginModalVisible(true);
    } else {
      router.push("/MyRecords");
    }
  };

  const handleSelectIcon = (iconIndex: number) => {
    if (setIconIndex === null) return;
    if (uid === null) {
      setIconIndex(iconIndex);
      return;
    }
    const fetchTopProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .update({ icon_index: iconIndex })
        .eq("uid", uid)
        .select();
      if (error) {
        console.error(error);
      } else {
        setIconIndex(iconIndex);
      }
      setLoading(false);
    };
    fetchTopProfiles();
  };

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      <StarBackground />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* ヘッダーバー */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.7}
            onPress={() => router.push("/Settings")}
          >
            <FontAwesome6 name="gear" size={20} color={CHOCOLATE_SUB} />
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
                {/* 外側グローリング */}
                {/* <View
                  style={[
                    styles.avatarRingOuter,
                    { borderColor: `${gumiColor}40` },
                  ]}
                />
                <View
                  style={[
                    styles.avatarRingInner,
                    { borderColor: `${gumiColor}25` },
                  ]}
                /> */}

                <View
                  style={[
                    styles.avatar,
                    {
                      borderColor: gumiColor,
                      shadowColor: gumiColor,
                    },
                  ]}
                >
                  <Image
                    source={ICONS[iconIndex ?? 0]}
                    style={styles.avatarImage}
                    resizeMode="contain"
                  />
                </View>

                {/* 編集バッジ */}
                <View style={styles.editBadge}>
                  <MaterialIcons name="edit" size={13} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {/* 名前 */}
              <Text style={styles.displayName}>
                {displayName || t("MyPage.guest")}
              </Text>
              <Text style={styles.username}>@{username || "guest"}</Text>

              {/* ポイント */}
              {/* <View style={styles.pointsBadge}>
                <Text style={styles.pointsValue}>
                  {(points || 0).toLocaleString()}
                </Text>
                <Text style={styles.pointsLabel}>pt</Text>
              </View> */}
            </View>

            {/* ─── くみカード ─── */}
            <View style={styles.gumiCard}>
              <View
                style={[styles.cardAccentLine, { backgroundColor: gumiColor }]}
              />
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
                      color={CHOCOLATE_SUB}
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
                          points: progressInfo.pointsNeeded,
                        })}
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          { backgroundColor: gumiColor, width: animatedWidth },
                        ]}
                      />
                      {/* グロー */}
                      <Animated.View
                        style={[
                          styles.progressBarGlow,
                          { backgroundColor: gumiColor, width: animatedWidth },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* ─── メニュー ─── */}
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

          {/* モーダル類（変更なし） */}
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
            currentGumiIndex={playersGumiIndex || 0}
            currentPoints={points || 0}
          />
        </ScrollView>
      </Animated.View>

      {loading && <LoadingOverlay text={t("MyPage.settingIcon")} />}
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
    justifyContent: "flex-end",
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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
  // avatarRingOuter: {
  //   position: "absolute",
  //   width: 128,
  //   height: 128,
  //   borderRadius: 64,
  //   borderWidth: 1.5,
  // },
  // avatarRingInner: {
  //   position: "absolute",
  //   width: 116,
  //   height: 116,
  //   borderRadius: 58,
  //   borderWidth: 1.5,
  // },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: STRAWBERRY,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: BACKGROUND,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  displayName: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 14,
    color: CHOCOLATE_SUB,
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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 0.5,
  },
  pointsLabel: {
    fontSize: 12,
    color: CHOCOLATE_SUB,
    fontWeight: "700",
  },

  // ─── くみカード ───
  gumiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardAccentLine: {
    height: 2.5,
    opacity: 0.6,
    shadowOpacity: 0.6,
    shadowRadius: 4,
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
    color: CHOCOLATE_SUB,
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
    // textShadowOffset: { width: 0, height: 0 },
    // textShadowRadius: 12,
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
    color: CHOCOLATE_SUB,
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
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(200,214,230,0.2)",
    overflow: "hidden",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressBarGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 4,
    opacity: 0.3,
    shadowOpacity: 1,
    shadowRadius: 6,
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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
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
    color: CHOCOLATE_SUB,
    opacity: 0.5,
  },
});
