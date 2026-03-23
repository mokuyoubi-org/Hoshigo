import { SkeletonCard } from "@/src/components/Cards/SkeletonCard";
import { PaywallModal } from "@/src/components/Modals/MyRecordsPaywallModal";
import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  cardHeight: number;
  t: any;
  setShowPaywall: (v: boolean) => void;
};

export const GhostCard = ({
  cardHeight,
  t,
  setShowPaywall,
}: Props) => (
  <View style={{ height: cardHeight, marginHorizontal: 16 }}>
    <SkeletonCard height={cardHeight} />
    <View style={StyleSheet.absoluteFillObject}>
      <View style={{ flex: 1, backgroundColor: "rgba(252,249,244,0.85)" }} />
      <PaywallModal t={t} setShowPaywall={setShowPaywall} />
    </View>
  </View>
);
