// ProfileScreen.tsx

import { Avatar } from "@/src/components/avatar/Avatar";
import { GuestNoticeCard } from "@/src/components/cards/GuestNoticeCard";
import { RankCard } from "@/src/components/cards/RankCard";
import { StatsBadges } from "@/src/components/cards/stats/StatsBadges";
import { MixedText } from "@/src/components/common/MixedText";
import { MyText } from "@/src/components/common/MyText";
import IconSelectModal from "@/src/components/modals/profileScreen/IconSelectModal";
import RankInfoModal from "@/src/components/modals/profileScreen/RankInfoModal";
import UsernameEditModal from "@/src/components/modals/profileScreen/UsernameEditModal";
import { LoginModal } from "@/src/components/modals/settingsScreen/LoginModal";
import { useMatching } from "@/src/contexts/MatchingContext";
import { useOverlay } from "@/src/contexts/OverlayContext";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useBlurActiveElement } from "@/src/hooks/common/useBlurActiveElement";
import { useColors } from "@/src/hooks/common/useTheme";
import { useProfileScreen } from "@/src/hooks/screens/useProfileScreen";
import { useTranslation } from "@/src/i18n/LangProvider";
import { boardSizeOptions } from "@/src/logics/format/boardSizeToText";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, MyHeader, SegmentedControl, TextButton } from "ui-atoms";

export default function ProfileScreen() {
  const fontFamily = useAppFont();
  const t = useTranslation();
  const colors = useColors();
  const { profileData, handlers } = useProfileScreen();
  const { isMatching } = useMatching();
  const { show, hide } = useOverlay();

  useBlurActiveElement();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="flex-1 w-full max-w-160 mx-auto px-4 pt-2">
        <MyHeader
          left={
            <SegmentedControl
              trackBackgroundColor={colors.backgroundStrong}
              activeSegmentBackgroundColor={colors.foreground}
              activeTextColor={colors.text}
              inactiveTextColor={colors.textSub}
              value={profileData.boardSize}
              options={boardSizeOptions(t)}
              onSelect={handlers.setBoardSize}
              fontFamily={fontFamily}
            />
          }
        >
          {/* ログインボタン */}
          {profileData.isAnonymous && (
            <TextButton
              text={t("common.login")}
              fontFamily={fontFamily}
              disabled={isMatching}
              textColor={colors.primary} // テキストの色
              backgroundColor={colors.foreground} // 背景色
              borderColor={colors.backgroundStrong} // 枠線の色
              onPress={() => show(<LoginModal visible={true} onClose={hide} />)}
            />
          )}

          <IconButton
            icon={<FontAwesome6 name="gear" />}
            iconColor={colors.primary}
            backgroundColor={colors.foreground}
            borderColor={colors.backgroundStrong}
            onPress={() => {
              router.push({ pathname: "/SettingsScreen" });
            }}
          />
        </MyHeader>

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
                  className={`absolute bottom-1 right-1 w-7 h-7 rounded-full border-2 border-foreground justify-center items-center ${
                    isMatching ? "bg-backgroundStrong" : "bg-primary"
                  }`}
                >
                  <MaterialIcons
                    name="edit"
                    size={14}
                    color={colors.foreground}
                  />
                </View>
              </TouchableOpacity>

              {/* username */}
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
                className="flex-row items-center gap-1 mb-2"
              >
                <MixedText className="text-3xl text-text tracking-wide">
                  {profileData.username}
                </MixedText>
                {!profileData.isAnonymous && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={22}
                    color={profileData.isPremium?colors.gold: colors.primary} // ブランドカラー（青など）で統一
                  />
                )}
                {/* ペンアイコン(ただの飾り) */}
                <View className="p-1">
                  <MaterialIcons
                    name="edit"
                    size={20}
                    color={
                      !isMatching ? colors.primary : colors.backgroundStrong
                    }
                  />
                </View>
              </TouchableOpacity>
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
            <StatsBadges boardSize={profileData.boardSize} />

            {/* 棋譜 */}
            <TouchableOpacity
              className="bg-foreground rounded-3xl border-2 border-backgroundStrong p-4 flex-row justify-between items-center"
              activeOpacity={0.7}
              onPress={() => {
                router.push({ pathname: "/RecordsScreen" });
              }}
            >
              <View className="flex-row items-center gap-2">
                <View className="w-9 h-9 rounded-xl bg-background justify-center items-center">
                  <Octicons name="history" size={18} color={colors.primary} />
                </View>
                <MyText className="text-lg text-text">
                  {t("common.records")}
                </MyText>
              </View>
              <Feather name="chevron-right" size={24} color={colors.primary} />
            </TouchableOpacity>

            {profileData.isAnonymous && (
              <GuestNoticeCard
                description={t("Profile.guestNoticeDesc")}
                onPress={() =>
                  show(<LoginModal visible={true} onClose={hide} />)
                }
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
