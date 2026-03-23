import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CHOCOLATE, CHOCOLATE_SUB, STRAWBERRY } from "@/src/constants/colors";
import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";

export const MainTitle = () => {
  const { t } = useTranslation();
  const {lang} = useContext(LangContext)!;

  return (
    <View style={styles.titleArea}>
      <Text style={styles.tagline}>{t("Home.tagline")}</Text>

      <Text style={styles.appTitle}>{t("Home.titleMain")}</Text>

      <Text style={lang === "en" ? styles.appMotto : styles.appRomaji}>
        {t("Home.titleReading")}
      </Text>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerDot} />
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  titleArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tagline: {
    fontSize: 10,
    letterSpacing: 5,
    color: CHOCOLATE_SUB,
    marginBottom: 14,
  },
  appTitle: {
    fontSize: 68,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 10,
  },
  appRomaji: {
    fontSize: 11,
    letterSpacing: 6,
    color: CHOCOLATE_SUB,
    marginTop: 8,
  },
  appMotto: {
    fontSize: 11,
    letterSpacing: 4,
    color: CHOCOLATE_SUB,
    marginTop: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: 160,
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(232,164,184,0.35)",
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STRAWBERRY,
    marginHorizontal: 10,
    opacity: 0.7,
  },
});