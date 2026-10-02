// SearchingButton.tsx

import { useMatching } from "@/src/active/contexts/MatchingContext";
import { useTranslation } from "@/src/active/i18n/LangProvider";
import { boardSizeToText } from "@/src/stable/logics/boardSizeToText";
import React, { useMemo, useState } from "react";
import { FloatingToast, useTransientVisibility } from "ui-atoms";
import { useAppFont } from "../../hooks/useAppFont";
import { useColors } from "../../hooks/useTheme";
import { DotAnimation } from "ui-atoms";

export function SearchingButton() {
  const colors = useColors();
  const fontFamily = useAppFont();
  const { isMatching, matchingBoardSize, cancelMatching } = useMatching();
  const [isCanceling, setIsCanceling] = useState(false);
  const t = useTranslation();
  const boardSizeText = boardSizeToText(matchingBoardSize ?? 9, t);

  const content = useMemo(() => ({ isCanceling }), [isCanceling]);

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

  const baseText = frozen.isCanceling
    ? t("common.canceling")
    : t("common.searching", { boardSize: boardSizeText });

  return (
    <FloatingToast
      visible={shouldRender}
      label={
        <DotAnimation text={baseText} />
      }
      busy={frozen.isCanceling}
      onAction={handleCancel}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      backgroundColor={colors.background}
      borderColor={colors.backgroundDark}
      textColor={colors.text}
      textSubColor={colors.textSub}
      accentColor={colors.primary}
      foregroundColor={colors.foreground}
      fontFamily={fontFamily}
    />
  );
}