import GumiInfoModal from "@/src/components/GumiInfoModal";
import IconSelectorModal from "@/src/components/IconSelectModal";
import LoadingOverlay from "@/src/components/LoadingOverlay";
import LoginNeededModal from "@/src/components/LoginNeededModal";
import { ICONS } from "@/src/lib/icons";
import { supabase } from "@/src/lib/supabase";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
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
import { calculateGumiProgress, getGumiByIndex } from "../../src/lib/gumiUtils";
import { useTheme } from "../../src/lib/useTheme";

export default function MyPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const username = useContext(UserNameContext);
  const displayName = useContext(DisplayNameContext);
  const points = useContext(PointsContext);
  const iconIndex = useContext(IconIndexContext);
  const setIconIndex = useContext(SetIconIndexContext);

  const playersGumiIndex = useContext(GumiIndexContext);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isIconSelectorVisible, setIsIconSelectorVisible] = useState(false);
  const [isGumiInfoVisible, setIsGumiInfoVisible] = useState(false);
  const uid = useContext(UidContext);
  const [loading, setLoading] = useState(false);

  // アニメーション用の値
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentGumi = getGumiByIndex(playersGumiIndex || 0);
  const gumiColor =
    colors[currentGumi.color as keyof typeof colors] || colors.text;

  // 進捗情報を計算
  const progressInfo = calculateGumiProgress(
    points || 0,

    playersGumiIndex || 0,
  );

  // デバッグ用
  useEffect(() => {
    console.log("🔍 MyPage values:", {
      points,
      playersGumiIndex,
      progressPercent: progressInfo.progressPercent,
      pointsNeeded: progressInfo.pointsNeeded,
    });
  }, [points, playersGumiIndex, progressInfo]);

  // ページ表示時にアニメーション開始
  useEffect(() => {
    // アニメーションをリセット
    progressAnim.setValue(0); // 0%から、

    // アニメーション実行
    Animated.timing(progressAnim, {
      toValue: progressInfo.progressPercent, // なん%までアニメートするか
      duration: 1000, // 1秒かけてアニメーション
      useNativeDriver: false, // widthアニメーションはnative driverが使えない
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
      // 未ログインユーザ
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
    // ここでユーザー設定をサーバーに保存する処理を追加できます

    // 例: saveUserIcon(uid, iconIndex);
  };

  // アニメーション用のwidth値を生成
  const animatedWidth = progressAnim.interpolate({
    // progressAnimをanimatedWidthに変換してくれてるらしい。たとえばprogressAnimの値が0ならanimatedWithは0%, 50なら50%, というように
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="auto" />
      {/* 右上の設定アイコン */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.settingsButton}
          activeOpacity={0.7}
          onPress={() => router.push("/Settings")}
        >
          <FontAwesome6 name="gear" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      playersGumiIndex === 0 ? "transparent" : gumiColor,
                  },
                ]}
                onPress={() => setIsIconSelectorVisible(true)}
                activeOpacity={0.7}
              >
                <Image
                  source={ICONS[iconIndex ?? 0]}
                  style={{ width: 108, height: 108 }}
                  resizeMode="contain"
                />
                {/* 編集アイコン */}
                <View
                  style={[
                    styles.editBadge,
                    { backgroundColor: colors.active || "#007AFF" },
                  ]}
                >
                  <MaterialIcons name="edit" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {displayName || t("MyPage.guest")}
            </Text>
            <Text style={[styles.username, { color: colors.subtext }]}>
              @{username || "guest"}
            </Text>
          </View>

          {/* くみ表示 */}
          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={[styles.statLabel, { color: colors.subtext }]}>
                  {t("MyPage.youAre")}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsGumiInfoVisible(true)}
                  style={styles.infoButton}
                  activeOpacity={0.6}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={20}
                    color={colors.subtext}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.statValue, { color: gumiColor }]}>
                {currentGumi.name}
              </Text>

              {/* 次のくみまでの進捗ゲージ */}
              {progressInfo.nextGumiName && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressTextRow}>
                    <Text
                      style={[styles.progressText, { color: colors.subtext }]}
                    >
                      {progressInfo.nextGumiName} ▶︎
                    </Text>
                    <Text
                      style={[styles.progressPoints, { color: colors.gauge }]}
                    >
                      {t("MyPage.remaining", {
                        points: progressInfo.pointsNeeded,
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarBackground,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: colors.gauge,
                          width: animatedWidth, //%が入っている。親に対する割合
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 棋譜 */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            activeOpacity={0.7}
            onPress={onRecords}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              {t("MyPage.myRecords")}
            </Text>
            <Text style={[styles.menuItemArrow, { color: colors.subtext }]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* ログインモーダル */}
        <LoginNeededModal
          visible={isLoginModalVisible}
          onClose={() => setIsLoginModalVisible(false)}
          message={t("MyPage.recordsLoginRequired")}
        />

        {/* アイコン選択モーダル */}
        <IconSelectorModal
          visible={isIconSelectorVisible}
          onClose={() => setIsIconSelectorVisible(false)}
          onSelectIcon={handleSelectIcon}
          currentIconIndex={iconIndex ?? 0}
        />

        {/* くみ情報モーダル */}
        <GumiInfoModal
          visible={isGumiInfoVisible}
          onClose={() => setIsGumiInfoVisible(false)}
          currentGumiIndex={playersGumiIndex || 0}
          currentPoints={points || 0}
        />
      </ScrollView>
      {/* ← ここがLoadingオーバーレイ */}
      {loading && <LoadingOverlay text={t("MyPage.settingIcon")} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  displayName: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  statsCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statItem: {
    alignItems: "center",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  infoButton: {
    padding: 2,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 16,
  },
  progressContainer: {
    width: "100%",
    marginTop: 8,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressPoints: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  menuItemArrow: {
    fontSize: 28,
    fontWeight: "300",
  },
});
