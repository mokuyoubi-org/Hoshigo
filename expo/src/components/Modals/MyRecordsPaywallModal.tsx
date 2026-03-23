import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── ペイウォールモーダル（落ち着いたデザイン） ───────────────
export const PaywallModal = ({
  t,
  setShowPaywall,
}: {
  t: any;
  setShowPaywall: any;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* 薄い霞レイヤー */}
      <View style={styles.fog} />

      <Animated.View
        style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* アイコン */}
        <Image
          source={require("@/assets/images/udon_sleep.png")}
          style={styles.characterImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          {t("MyRecordsPaywallModal.premiumTitle")}
        </Text>
        <Text style={styles.subtitle}>
          {t("MyRecordsPaywallModal.premiumSubtitle")}
        </Text>

        {/* 区切り線 */}
        <View style={styles.divider} />

        {/* 特典リスト */}
        <View style={styles.benefits}>
          {[
            {
              text: t("MyRecordsPaywallModal.benefit1"),
            },
            {
              text: t("MyRecordsPaywallModal.benefit2"),
            },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* CTAボタン */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => {
            setShowPaywall(true);
          }}
          activeOpacity={0.75}
        >
          <Text style={styles.ctaText}>
            {t("MyRecordsPaywallModal.premiumCTA")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  characterImage: { width: 80, height: 80, borderRadius: 12 },
  textArea: {
    alignItems: "center",
    gap: 12,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  fog: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,245,240,0.5)",
  },
  card: {
    width: "84%",
    backgroundColor: "#fdfcf9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(180,160,130,0.25)",
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#8a6a3a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
  },
  topLine: {
    height: 2,
    width: "100%",
    backgroundColor: "rgba(180,150,100,0.5)",
    marginBottom: 22,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(180,150,100,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconText: {
    fontSize: 20,
    color: "#9a7040",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2e1f0e",
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#8a6a4a",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(180,160,130,0.18)",
    marginBottom: 16,
  },
  benefits: {
    width: "100%",
    gap: 10,
    marginBottom: 22,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitIcon: {
    fontSize: 14,
    width: 20,
    textAlign: "center",
  },
  benefitText: {
    fontSize: 13,
    color: "#4a3820",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  cta: {
    width: "100%",
    backgroundColor: "#7a5530",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#7a5530",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.4,
  },
  footer: {
    marginTop: 12,
    fontSize: 11,
    color: "#a08060",
    letterSpacing: 0.2,
  },
});
