// ProfileScreen.tsx
import {
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GuestNoticeCard } from "@/src/active/components/cards/GuestNoticeCard";
import { RankCard } from "@/src/active/components/cards/RankCard";
import { Avatar } from "@/src/active/components/common/Avatar";
import { Header } from "@/src/active/components/common/Header";
import IconSelectModal from "@/src/active/components/modals/IconSelectModal";
import { LoginModal } from "@/src/active/components/modals/LoginModal";
import RankInfoModal from "@/src/active/components/modals/RankInfoModal";
import UsernameEditModal from "@/src/active/components/modals/UsernameEditModal";
import { COLORS } from "@/src/active/constants/colors";
import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useOverlay } from "@/src/active/contexts/OverlayContext";
import { useProfileScreen } from "@/src/active/hooks/screens/useProfileScreen";
import { useTranslation } from "@/src/active/i18n";
import { BOARD_SIZE_OPTIONS } from "go-core";
import { IconButton, SegmentedControl, TextButton } from "ui-atoms";

export default function ProfileScreen() {
  const t = useTranslation();
  const { profileData, handlers } = useProfileScreen();
  const { isMatching } = useMatching();
  const { show, hide } = useOverlay();

  useEffect(() => {
    // ⚠️⚠️⚠️謎のエラーを防ぐための部分なので消さない。これがないとBlocked aria-hidden...とか言われる
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-[680px] mx-auto px-5 pt-3">
        <Header
          left={
            <SegmentedControl
              value={profileData.boardSize}
              options={BOARD_SIZE_OPTIONS}
              onSelect={handlers.setBoardSize}
              activeSegmentWidth={72}
              inactiveSegmentWidth={48}
            />
          }
        >
          {profileData.isAnonymous && (
            <TextButton
              disabled={isMatching}
              text={t("common.login")}
              color={COLORS.primary} // テキストの色
              backgroundColor={COLORS.foreground} // 背景色
              borderColor={COLORS.backgroundDark} // 枠線の色
              onPress={() => show(<LoginModal visible={true} onClose={hide} />)}
            />
          )}

          <IconButton
            icon={<FontAwesome6 name="gear" />}
            color={COLORS.primary}
            onPress={() => {
              router.push("/SettingsScreen");
            }}
          />
        </Header>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="pt-4 pb-12 gap-4">
            {/* アイコン & username */}
            <View className="justify-center items-center pt-4">
              {/* アイコン */}
              <TouchableOpacity
                disabled={isMatching}
                onPress={() =>
                  show(
                    <IconSelectModal
                      visible={true}
                      onClose={hide}
                      onSelectIcon={async (iconIndex) => {
                        await handlers.handleSelectIcon(iconIndex);
                        hide();
                      }}
                      currentIconIndex={profileData.iconIndex}
                    />,
                  )
                }
                activeOpacity={0.8}
                className="mb-3 relative"
              >
                <Avatar
                  rankIndex={profileData.rankInfo.index}
                  iconIndex={profileData.iconIndex}
                  size={96}
                />
                <View
                  className={`absolute bottom-1 right-1 w-7 h-7 rounded-full border-2 border-background justify-center items-center ${
                    isMatching ? "bg-primaryLight" : "bg-primary"
                  }`}
                >
                  <MaterialIcons
                    name="edit"
                    size={14}
                    color={COLORS.foreground}
                  />
                </View>
              </TouchableOpacity>

              {/* username */}
              <View className="flex-row items-center gap-1 mb-2.5">
                <Text className="text-3xl font-extrabold text-text tracking-wide">
                  {profileData.username}
                </Text>
                {!profileData.isAnonymous && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={22}
                    color={COLORS.primary} // ブランドカラー（青など）で統一
                  />
                )}
                <TouchableOpacity
                  disabled={isMatching}
                  onPress={() =>
                    show(
                      <UsernameEditModal
                        visible={true}
                        currentUsername={profileData.username ?? ""}
                        onClose={hide}
                        onSubmit={async (newUsername) => {
                          // 1. 処理結果（エラー文字列、または null）を受け取る
                          const error =
                            await handlers.handleUpdateUsername(newUsername);
                          if (error) {
                            // エラーがあったら、モーダルを閉じずにエラー文字を返して画面に表示させる
                            return error;
                          }
                          // エラーがなかった（成功した）時だけモーダルを閉じる
                          hide();
                        }}
                      />,
                    )
                  }
                  activeOpacity={0.7}
                  className={`p-1 ${isMatching ? "opacity-40" : "opacity-100"}`}
                >
                  <MaterialIcons name="edit" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ランクカード */}
            <RankCard
              rankInfo={profileData.rankInfo}
              onOpenInfo={() =>
                show(
                  <RankInfoModal
                    visible={true}
                    onClose={hide}
                    rankInfo={profileData.rankInfo}
                  />,
                )
              }
            />

            {/* 戦績カード */}
            {/* <StatsCard /> */}

            {/* 棋譜 */}
            <TouchableOpacity
              className="bg-foreground rounded-3xl border-2 border-backgroundDark p-[18px] flex-row justify-between items-center"
              activeOpacity={0.7}
              onPress={() => {
                router.push("/RecordsScreen");
              }}
            >
              <View className="flex-row items-center gap-1.5">
                <View className="w-9 h-9 rounded-xl bg-background justify-center items-center mr-1.5">
                  <Octicons name="history" size={18} color={COLORS.primary} />
                </View>
                <Text className="text-lg font-bold text-text">
                  {t("common.records")}
                </Text>
              </View>
              <Octicons name="chevron-right" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {profileData.isAnonymous && (
              <GuestNoticeCard
                title={t("Profile.guestAccount")}
                description={t("Profile.guestNoticeDesc")}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
