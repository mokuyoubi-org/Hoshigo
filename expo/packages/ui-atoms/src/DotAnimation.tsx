import React, { useEffect, useState } from "react";
import { Text, TextProps } from "react-native";

type Props = {
  text: string;
  interval?: number;
} & TextProps;

export function DotAnimation({
  text,
  interval = 1000,
  style,
  ...props
}: Props) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  const visibleDots = ".".repeat(count);
  const hiddenDots = ".".repeat(3 - count);

  return (
    <Text style={style} {...props}>
      {text}
      {visibleDots}
      <Text style={{ opacity: 0 }}>{hiddenDots}</Text>
    </Text>
  );
}
