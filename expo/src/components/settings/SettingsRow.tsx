import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { Feather } from "@expo/vector-icons";
import { ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";

type SettingsRowProps = {
  label: string;
  onPress?: () => void;
  rightElement?: ReactNode;
};

export const SettingsRow = ({
  label,
  onPress,
  rightElement,
}: SettingsRowProps) => {
  const colors = useColors();
  // onPressがあるときは、rightElementがあってもなくても右矢印を表示する
  const right = (
    <View className="flex-row items-center gap-2">
      {rightElement}
      {onPress && (
        <Feather name="chevron-right" size={22} color={colors.textSub} />
      )}
    </View>
  );

  const content = (
    // ここは<View>にしてはいけない
    <>
      <MyText className="text-lg text-text tracking-wide">{label}</MyText>
      {right}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="flex-row justify-between items-center p-4 min-h-14 w-full"
        activeOpacity={0.7}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row justify-between items-center p-4 min-h-14 w-full">
      {content}
    </View>
  );
};
