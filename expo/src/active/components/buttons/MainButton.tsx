import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { BoardSize } from "@/src/stable/types/goTypes";
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  onPress: () => void;
  boardSize: BoardSize;
  disabled?: boolean;
};

export function MainButton({ onPress, boardSize, disabled = false }: Props) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const t = useTranslation();

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 0.94,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.buttonArea}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        disabled={disabled}
      >
        <View style={styles.glowWrapper}>
          <Animated.View
            style={[
              styles.matchButton,
              {
                transform: [{ scale: pressScale }],
              },
              disabled && styles.matchButtonDisabled, // 押せないときは薄くする
            ]}
          >
            <Text style={styles.btnLabel}>{t("Home.tap")}</Text>
            <Text style={styles.btnText}>{t("common.play")}</Text>
            <Text style={styles.btnText}>{boardSize}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  matchButton: {
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: COLORS.foreground,
    borderWidth: 8,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  matchButtonDisabled: {
    opacity: 0.5,
  },

  glowWrapper: {
    borderRadius: 100,
  },

  btnLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: COLORS.text,
    marginBottom: 6,
  },

  btnText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 2,
  },
});
