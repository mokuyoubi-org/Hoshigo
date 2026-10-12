// BotPlayStopButtons.tsx

import { useColors } from "@/src/hooks/common/useTheme";
import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";

export const BotPlayStopButtons = ({
  isPaused,
  disabled,
  onTogglePause,
  onStop,
}: {
  isPaused: boolean;
  disabled: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}) => {
  const colors = useColors();

  return (
    <View className="flex-row gap-2">
      {/* ⏸ / ▶ ボタン */}
      <TouchableOpacity
        className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
          disabled ? "border-backgroundStrong" : "border-primaryStrong"
        }`}
        onPress={onTogglePause}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <FontAwesome6
          name={isPaused ? "play" : "pause"}
          size={26}
          color={disabled ? colors.backgroundStrong : colors.primaryStrong}
        />
      </TouchableOpacity>

      {/* ⏹ ボタン */}
      <TouchableOpacity
        className={`flex-1 h-14 border-2 rounded-2xl justify-center items-center bg-foreground ${
          disabled ? "border-failureLight" : "border-failure"
        }`}
        onPress={onStop}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <FontAwesome6
          name="stop"
          size={24}
          color={disabled ? colors.failureLight : colors.failure}
        />
      </TouchableOpacity>
    </View>
  );
};
