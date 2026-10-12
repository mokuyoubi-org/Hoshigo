// SearchingButton.tsx

import { useMatching } from "@/src/contexts/MatchingContext";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { boardSizeToText } from "@/src/logics/format/boardSizeToText";
import { useMemo, useState } from "react";
import { DotAnimation, FloatingToast, useTransientVisibility } from "ui-atoms";

export const SearchingButton = () => {
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
      label={<DotAnimation text={baseText} />}
      busy={frozen.isCanceling}
      onAction={handleCancel}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      backgroundColor={colors.background}
      borderColor={colors.backgroundStrong}
      textColor={colors.text}
      textSubColor={colors.textSub}
      accentColor={colors.primary}
      foregroundColor={colors.foreground}
      fontFamily={fontFamily}
    />
  );
};
