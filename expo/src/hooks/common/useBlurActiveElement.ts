// useBlurActiveElement.ts

import { useEffect } from "react";

// ⚠️⚠️⚠️謎のエラーを防ぐための部分。これがないとBlocked aria-hidden...とか言われる
export const useBlurActiveElement = (): void => {
  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, []);
};
