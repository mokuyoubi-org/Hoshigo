import { COLORS } from "@/src/active/constants/colors";
import { useMatching } from "@/src/active/contexts/providers/MatchingContext";
import { useTranslation } from "@/src/active/i18n";
import React, { useMemo, useState } from "react";
import { FloatingToast, useTransientVisibility } from "ui-atoms";

export function SearchingButton() {
  const { isMatching, matchingBoardSize, cancelMatching } = useMatching();
  const [isCanceling, setIsCanceling] = useState(false);
  const t = useTranslation();

  const boardSizeText = matchingBoardSize
    ? `${matchingBoardSize}×${matchingBoardSize} `
    : " ";

  const content = useMemo(
    () => ({ isCanceling, boardSizeText }),
    [isCanceling, boardSizeText],
  );

  const {
    shouldRender,
    fadeAnim,
    slideAnim,
    content: frozen,
  } = useTransientVisibility(isMatching, content);

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      await cancelMatching();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <FloatingToast
      visible={shouldRender}
      label={
        frozen.isCanceling
          ? t("common.canceling")
          : `${t("common.searching")} ${frozen.boardSizeText}...`
      }
      busy={frozen.isCanceling}
      onAction={handleCancel}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      backgroundColor={COLORS.background}
      borderColor={COLORS.backgroundDark}
      textColor={COLORS.text}
      textSubColor={COLORS.textSub}
      accentColor={COLORS.primary}
      foregroundColor={COLORS.foreground}
    />
  );
}
