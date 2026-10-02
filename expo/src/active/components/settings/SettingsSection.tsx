import React from "react";
import { View } from "react-native";
import { AppText } from "../common/AppText";
import { Divider } from "../common/Divider";

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const items = React.Children.toArray(children);

  return (
    <View className="mb-6">
      <AppText className="text-sm uppercase tracking-widest text-textSub mb-2.5 ml-1">
        {title}
      </AppText>
      <View className="bg-foreground rounded-xl border-2 border-backgroundStrong w-full overflow-hidden">
        {items.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
