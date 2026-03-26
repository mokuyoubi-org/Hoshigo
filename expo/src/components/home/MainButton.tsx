import { CHOCOLATE, STRAWBERRY } from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
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
};

export function MainButton({ onPress }: Props) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const { t } = useTranslation();

  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.94,
      friction: 8,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();

  return (
    <View style={styles.buttonArea}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={styles.glowWrapper}>
          <Animated.View
            style={[
              styles.matchButton,
              {
                transform: [{ scale: pressScale }],
              },
            ]}
          >
            <Text style={styles.btnLabel}>{t("Home.tap")}</Text>
            <Text style={styles.btnText}>{t("common.play")}</Text>
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
    backgroundColor: "#fff8fa",
    borderWidth: 8,
    borderColor: STRAWBERRY,
    justifyContent: "center",
    alignItems: "center",
  },

  glowWrapper: {
    borderRadius: 100,
  },

  btnLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: "CHOCOLATE_SUB",
    marginBottom: 6,
  },

  btnText: {
    fontSize: 28,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 2,
  },
});
