// shell/modalSizing.ts
export type ModalSize = "sm" | "md" | "lg";

// 狭い画面では比率側が、広い画面ではpx上限側が効く。
// sizeごとに比率も変えることで、狭い画面でもsize間の差を維持する。
const SIZE_WIDTH_RATIO: Record<ModalSize, number> = {
  sm: 0.48,
  md: 0.72,
  lg: 0.88,
};

const SIZE_MAX_WIDTH: Record<ModalSize, number> = {
  sm: 320,
  md: 400,
  lg: 480,
};

const MIN_WIDTH = 240;
const HEIGHT_RATIO = 0.85;

export function computeModalBox(
  windowWidth: number,
  windowHeight: number,
  size: ModalSize,
) {
  const width = Math.max(
    MIN_WIDTH,
    Math.min(windowWidth * SIZE_WIDTH_RATIO[size], SIZE_MAX_WIDTH[size]),
  );
  const maxHeight = windowHeight * HEIGHT_RATIO;
  return { width, maxHeight };
}
