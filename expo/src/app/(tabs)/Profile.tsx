import { Feather, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NineThirteenButton } from "@/src/active/components/buttons/NineThirteenButton";
import { Avatar } from "@/src/active/components/go/Avatar";
import { ConfirmModal } from "@/src/active/components/modals/ConfirmModal";
import GroupInfoModal from "@/src/active/components/modals/GroupInfoModal";
import IconSelectorModal from "@/src/active/components/modals/IconSelectModal";
import LoadingModal from "@/src/active/components/modals/LoadingModal";
import { COLORS } from "@/src/active/constants/colors";
import { useLang } from "@/src/active/contexts/LangContext";

import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import {
  calculateGroupProgress,
  getGroupByIndex,
} from "@/src/active/logics/groupLogics";
import { pointsToWins } from "@/src/active/logics/utilLogics";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { BoardSize } from "@/src/stable/types/goTypes";

export default function Profile() {
  const t = useTranslation();
  const { lang } = useLang();
  const { profile, updateProfile } = useProfile();

  // profileオブジェクトから使いたい値をそのまま取り出すだけ
  const {
    username,
    points9,
    points13,
    iconIndex,
    groupIndex9,
    groupIndex13,
    uid,
  } = profile;

  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isIconSelectorVisible, setIsIconSelectorVisible] = useState(false);
  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const is9 = boardSize === 9;
  const currentGroupIndex = (is9 ? groupIndex9 : groupIndex13) ?? 0;
  const currentPoints = (is9 ? points9 : points13) ?? 0;

  const currentGroup = getGroupByIndex(currentGroupIndex, t);
  const groupColor =
    COLORS[currentGroup.color as keyof typeof COLORS] || COLORS.text;
  const progressInfo = calculateGroupProgress(
    currentPoints,
    currentGroupIndex,
    t,
  );

  const progressAnim = useRef(new Animated.Value(0)).current;
  const winsNeeded = pointsToWins(progressInfo.pointsNeeded);
  const winText = lang === "en" ? (winsNeeded === 1 ? "win" : "wins") : "";

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: progressInfo.progressPercent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [boardSize]); // このboardSizeは外さない

  const onRecords = () => {
    if (!uid || !username) {
      setIsLoginModalVisible(true);
    } else {
      router.push("/Records");
    }
  };

  const handleSelectIcon = (selectedIconIndex: number) => {
    if (!uid) {
      updateProfile({ iconIndex: selectedIconIndex });
      return;
    }
    const updateIcon = async () => {
      setLoading(true);
      const { error } = await supabase.rpc("update_icon_index", {
        new_icon_index: selectedIconIndex,
      });
      if (error) {
        console.error(error);
      } else {
        updateProfile({ iconIndex: selectedIconIndex });
      }
      setLoading(false);
    };
    updateIcon();
  };

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ヘッダー */}
      <View style={styles.header}>
        <NineThirteenButton boardSize={boardSize} onToggle={setBoardSize} />
        <TouchableOpacity
          style={[styles.center, styles.iconBtn]}
          activeOpacity={0.7}
          onPress={() => router.push("/Settings")}
        >
          <FontAwesome6 name="gear" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.scrollContent}>
        {/* ヒーローエリア */}
        <View style={styles.center}>
          <TouchableOpacity
            onPress={() => setIsIconSelectorVisible(true)}
            activeOpacity={0.8}
            style={styles.avatarWrapper}
          >
            <Avatar
              groupIndex={currentGroupIndex}
              iconIndex={iconIndex ?? 0}
              size={96}
            />
            <View style={[styles.center, styles.editBadge]}>
              <MaterialIcons name="edit" size={13} color={COLORS.foreground} />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{username || "guest"}</Text>
        </View>

        {/* くみカード */}
        <View style={styles.card}>
          <View style={styles.rowCenter}>
            <Text style={styles.groupLabel}>{t("Profile.youAre")}</Text>
            <TouchableOpacity
              onPress={() => setIsGroupInfoVisible(true)}
              activeOpacity={0.6}
              style={{ padding: 2 }}
            >
              <MaterialIcons
                name="info-outline"
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.groupName, { color: groupColor }]}>
            {currentGroup.name}
          </Text>

          {progressInfo.nextGroupName && (
            <View style={{ width: "100%" }}>
              <View style={styles.rowBetween}>
                <Text style={styles.progressNext}>
                  {progressInfo.nextGroupName} ▶︎
                </Text>
                <Text style={[styles.progressPoints, { color: groupColor }]}>
                  {t("Profile.remaining", { wins: winsNeeded, winText })}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: groupColor, width: animatedWidth },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* クラウドメニュー */}
        <TouchableOpacity
          style={[styles.card, styles.rowBetween, { padding: 18 }]}
          activeOpacity={0.7}
          onPress={onRecords}
        >
          <View style={styles.rowCenter}>
            <View style={[styles.center, styles.menuIconWrapper]}>
              <Feather name="cloud" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.menuItemText}>{t("common.cloud")}</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* モーダル類 */}
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
      <IconSelectorModal
        visible={isIconSelectorVisible}
        onClose={() => setIsIconSelectorVisible(false)}
        onSelectIcon={handleSelectIcon}
        currentIconIndex={iconIndex ?? 0}
      />
      <GroupInfoModal
        boardSize={boardSize}
        visible={isGroupInfoVisible}
        onClose={() => setIsGroupInfoVisible(false)}
        currentGroupIndex={currentGroupIndex}
        currentPoints={currentPoints}
      />
      <LoadingModal text={t("common.loading")} visible={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: "center", alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    backgroundColor: COLORS.foreground,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 18,
  },

  avatarWrapper: { marginBottom: 12 },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  username: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  card: {
    backgroundColor: COLORS.foreground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    padding: 28,
    alignItems: "center",
  },
  groupLabel: {
    fontSize: 11,
    color: COLORS.text,
    letterSpacing: 2,
    fontWeight: "700",
  },
  groupName: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 1,
    marginVertical: 10,
  },

  progressNext: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
    opacity: 0.7,
  },
  progressPoints: { fontSize: 12, fontWeight: "700" },
  progressBarBg: {
    width: "100%",
    height: 24,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    overflow: "hidden",
    marginTop: 10,
  },
  progressBarFill: { height: "100%", borderRadius: 24 },

  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginRight: 6,
  },
  menuItemText: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  menuItemArrow: {
    fontSize: 28,
    fontWeight: "300",
    color: COLORS.text,
    opacity: 0.5,
  },
});
