// SettingsSection.tsx

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { Children, Fragment, ReactNode } from "react";
import { View } from "react-native";
import { Divider } from "ui-atoms";

type Props = {
  title: string;
  children: ReactNode;
};

export const SettingsSection = ({ title, children }: Props) => {
  const colors = useColors();
  const items = Children.toArray(children);

  return (
    <View className="mb-6">
      <MyText className="text-sm uppercase tracking-widest text-textSub mb-2 ml-2">
        {title}
      </MyText>
      <View className="bg-foreground rounded-xl border-2 border-backgroundStrong w-full overflow-hidden">
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < items.length - 1 && (
              <Divider backgroundColor={colors.backgroundStrong} />
            )}
          </Fragment>
        ))}
      </View>
    </View>
  );
};
