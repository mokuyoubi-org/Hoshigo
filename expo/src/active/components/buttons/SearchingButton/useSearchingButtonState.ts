// SearchingButton/useSearchingButtonState.ts

import { useMatching } from "@/src/active/contexts/providers/MatchingContext";
import { useTranslation } from "@/src/active/language/i18n";
import { useEffect, useState } from "react";
import { Animated } from "react-native";

export function useSearchingButtonState() {
  const { isMatching, matchingBoardSize, cancelMatching } = useMatching();
  const [isCanceling, setIsCanceling] = useState(false);
  const t = useTranslation();

  const boardSizeText = matchingBoardSize
    ? `${matchingBoardSize}×${matchingBoardSize} `
    : " ";

  // アニメーション用の値
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(20));

  // マウント状態管理
  const [isMounted, setIsMounted] = useState(isMatching);
  const shouldRender = isMatching || isMounted;

  // 退場中も直前の状態を保持するためのステート
  const [displayState, setDisplayState] = useState({
    isCanceling,
    boardSizeText,
  });

  // 1. マウントフラグの同期
  if (isMatching && !isMounted) {
    setIsMounted(true);
  }

  // 2. マッチング中の表示状態の同期（レンダリング中のstate調整）
  if (
    isMatching &&
    (displayState.isCanceling !== isCanceling ||
      displayState.boardSizeText !== boardSizeText)
  ) {
    setDisplayState({
      isCanceling,
      boardSizeText,
    });
  }

  useEffect(() => {
    if (isMatching) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isMounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 退場アニメーションが完全に終わって消えるときに、次回の表示用にリセット！
        setIsCanceling(false);
        setDisplayState({
          isCanceling: false,
          boardSizeText: "",
        });
        setIsMounted(false);
      });
    }
  }, [isMatching, isMounted, fadeAnim, slideAnim]);

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      await cancelMatching();
    } catch (error) {
      console.error(error);
    } finally {
      // キャンセル処理が終わったら isCanceling フラグを下げるにゃ
      setIsCanceling(false);
    }
  };

  return {
    shouldRender,
    fadeAnim,
    slideAnim,
    isCanceling: displayState.isCanceling,
    boardSizeText: displayState.boardSizeText,
    handleCancel,
    t,
  };
}
