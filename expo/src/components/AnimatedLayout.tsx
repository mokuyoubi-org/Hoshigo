import React, { ReactNode, useEffect, useRef } from "react";
import { Animated } from "react-native";

type Props = {
  children: ReactNode;
};

export default function AnimatedLayout({ children }: Props) {
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeIn }}>
      {children}
    </Animated.View>
  );
}
