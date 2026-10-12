// ui-atoms/src/DotAnimation.tsx

import { useEffect, useState } from "react";
import { Text, TextProps } from "react-native";

type Props = {
  text: string;
  interval?: number;
} & TextProps;

export const DotAnimation = ({
  text,
  interval = 1000,
  style,
  ...props
}: Props) => {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  const visibleDots = ".".repeat(count);
  // 見えない「点と同じ幅のすき間」で場所とりをする
  const hiddenDots = "\u2008".repeat(3 - count);

  return (
    <Text style={style} {...props}>
      {text}
      {visibleDots}
      {hiddenDots}
    </Text>
  );
};
