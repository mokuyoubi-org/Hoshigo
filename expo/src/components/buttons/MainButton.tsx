// MainButton.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { BoardSize } from "go-core";
import { useState } from "react";
import { Animated, Platform, TouchableOpacity, View } from "react-native";

type Props = {
  onPress: () => void;
  boardSize?: BoardSize;
  disabled?: boolean;
  text: string;
};

const SCALE_PRESSED = 0.96;
const FRICTION_PRESS_IN = 8;
const FRICTION_PRESS_OUT = 5;

export const MainButton = ({
  onPress,
  boardSize,
  disabled = false,
  text,
}: Props) => {
  const colors = useColors();

  const [pressScale] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: SCALE_PRESSED,
      friction: FRICTION_PRESS_IN,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(pressScale, {
      toValue: 1,
      friction: FRICTION_PRESS_OUT,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View
          className={`w-80 h-20 rounded-2xl bg-foreground border-2 border-primary justify-center ${
            disabled ? "opacity-50" : ""
          }`}
          style={{
            // ⚠️boxshadowを使うことが大事
            boxShadow: `4px 6px 0px ${colors.primary}`,
          }}
        >
          <View className="flex-row items-center justify-center gap-x-4">
            <MyText className="text-2xl text-text tracking-widest uppercase">
              {text}
            </MyText>

            {boardSize && (
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                <MyText className="text-foreground text-xl">{boardSize}</MyText>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};
