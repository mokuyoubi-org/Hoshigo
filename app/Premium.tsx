import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useContext } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IsPremiumContext } from "../src/components/UserContexts";
import { useTheme } from "../src/lib/useTheme";

export default function Premium() {
  const isPremium = useContext(IsPremiumContext);
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonText, { color: colors.active }]}>
                ‹ 戻る
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>プラン</Text>
          </View>

          {/* 現在のプラン */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
              現在のプラン
            </Text>
            <View
              style={[
                styles.currentPlanCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Text style={[styles.currentPlanName, { color: colors.text }]}>
                {isPremium ? "星碁プラス" : "スタートプラン"}
              </Text>
              <Text
                style={[styles.currentPlanPrice, { color: colors.subtext }]}
              >
                {isPremium ? "月額" : "無料"}
              </Text>
            </View>
          </View>

          {/* スタートプラン */}
          <View style={styles.section}>
            <View
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>
                  スタートプラン
                </Text>
                <Text style={[styles.planPrice, { color: colors.subtext }]}>
                  無料
                </Text>
              </View>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text
                    style={[styles.featureBullet, { color: colors.active }]}
                  >
                    •
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    一日10局まで対局可能
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text
                    style={[styles.featureBullet, { color: colors.active }]}
                  >
                    •
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    同時観戦は3局まで
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text
                    style={[styles.featureBullet, { color: colors.active }]}
                  >
                    •
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    棋譜は10局まで保存
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* プラスプラン */}
          <View style={styles.section}>
            <View
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>
                  星碁プラス
                </Text>
                <View>
                  <Text style={[styles.planPrice, { color: colors.subtext }]}>
                    月額
                  </Text>
                  {/* <Text
                    style={[styles.planPriceAlt, { color: colors.subtext }]}
                  >
                    年額 ¥3,200
                  </Text> */}
                </View>
              </View>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text
                    style={[styles.featureBullet, { color: colors.active }]}
                  >
                    •
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    対局数無制限
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text
                    style={[styles.featureBullet, { color: colors.active }]}
                  >
                    •
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    同時観戦数無制限
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text
                    style={[styles.featureBullet, { color: colors.active }]}
                  >
                    •
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    棋譜は全てクラウドに保存
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.comingSoonBadge,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.comingSoonText, { color: colors.subtext }]}
                >
                  Coming Soon
                </Text>
              </View>
            </View>
          </View>

          {/* 注記 */}
          <View style={styles.noteSection}>
            <Text style={[styles.noteText, { color: colors.subtext }]}>
              プラスプランは現在準備中です。もうしばらくお待ちください。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  section: {
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
  currentPlanCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  currentPlanPrice: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  planCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    position: "relative",
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  planPriceAlt: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureBullet: {
    fontSize: 20,
    marginRight: 12,
    marginTop: -2,
  },
  featureText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.2,
    flex: 1,
    lineHeight: 22,
  },
  comingSoonBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  noteSection: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
    lineHeight: 20,
    textAlign: "center",
  },
});
