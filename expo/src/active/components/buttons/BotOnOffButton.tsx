import { COLORS } from "@/src/active/constants/colors";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

interface Props {
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 30;
const KNOB_SIZE = 24;
const PADDING = 3;

export const BotOnOffButton = ({ value, onToggle, disabled }: Props) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]); // このvalueは大事。valueが変わるたびにこのuseEffectが発火するから。

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.backgroundDark, COLORS.primary],
  });

  const knobTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - KNOB_SIZE - PADDING * 2],
  });

  return (
    <Pressable
      onPress={() => !disabled && onToggle(!value)}
      hitSlop={8}
      disabled={disabled}
      style={disabled && styles.disabled}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: knobTranslate }] }]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: PADDING,
    justifyContent: "center",
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: COLORS.foreground,
    elevation: 2,
  },
});
