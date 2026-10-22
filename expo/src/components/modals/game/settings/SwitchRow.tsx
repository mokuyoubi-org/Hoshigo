// SwitchRow.tsx

import { ToggleSwitch } from "@/packages/ui-atoms/src";
import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { View } from "react-native";

// 🔘 「ラベル + スイッチ」の1行
type Props = {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
};

export const SwitchRow = ({ label, value, onToggle }: Props) => {
  const colors = useColors();
  return (
    <View className="flex-row justify-between items-center px-4 py-3 min-h-12">
      <MyText className="text-lg text-text">{label}</MyText>
      <ToggleSwitch
        value={value}
        onToggle={onToggle}
        backgroundOnColor={colors.primary}
        backgroundOffColor={colors.backgroundStrong}
        toggleColor={colors.foreground}
      />
    </View>
  );
};