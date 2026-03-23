import { useTranslation } from "@/src/contexts/LocaleContexts";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function TsumegoLanguageNoticeModal({
  visible,
  onClose,
}: Props) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <Text style={styles.text}>{t("tsumegoLanguageNotice.message")}</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>{t("common.ok")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  box: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },

  text: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
