// Badge.tsx

import { useColors } from "@/src/hooks/common/useTheme";
import { View, ViewStyle } from "react-native";
import { MyText } from "../../common/MyText";

type Props = {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  style?: ViewStyle;
};

export const Badge = ({ icon, value, label }: Props) => {
  const colors = useColors();

  return (
    <View
      className="rounded-full border-2 py-1.5 px-4 flex-row items-center gap-2.5"
      style={{
        backgroundColor: colors.foreground,
        borderColor: colors.backgroundStrong,
      }}
    >
      {icon}
      <MyText className="text-base font-bold" style={{ color: colors.text }}>
        {value}
      </MyText>
      <MyText className="text-sm font-medium" style={{ color: colors.text }}>
        {label}
      </MyText>
    </View>
  );
};
