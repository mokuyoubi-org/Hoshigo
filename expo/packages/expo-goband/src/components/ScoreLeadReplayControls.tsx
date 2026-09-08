import Slider from "@react-native-community/slider";
import React, { useCallback, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { RecordAnalysis } from "../types/analysis";

export const COLORS = {
  foreground: "#ffffff",
  background: "#f0f5f9",
  backgroundDark: "#e1e8ed",
  primaryLight: "#d6e2ed",
  primary: "#b4c9db",
  primaryDark: "#8e9daa",
  darkObject: "#455763",
  darkObjectAccent: "#848f97",
  lightObject: "#fcfcfc",
  lightObjectAccent: "#9db3c0",
} as const;

type Props = {
  showScoreLeadGraph?: boolean;
  analysis?: RecordAnalysis | null;
  currentIndex: number;
  totalMoves: number;
  onCurrentIndexChange: React.Dispatch<React.SetStateAction<number>>;
};

const CHART_HEIGHT = 60;
const PADDING_Y = 8;
const MIN_RANGE = 5;

// スライダーのつまみの端（パディング）補正用
// React Native の Slider は端に少し余白ができるため、グラフの端と合わせる調整幅だ
const SLIDER_INSET = 8;

// スムースな折れ線パスを作る関数
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

export function ScoreLeadReplayControls({
  showScoreLeadGraph = true,
  analysis,
  currentIndex,
  totalMoves,
  onCurrentIndexChange,
}: Props) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const onPrevious = useCallback(() => {
    onCurrentIndexChange((prev) => (prev > 0 ? prev - 1 : prev));
  }, [onCurrentIndexChange]);

  const onNext = useCallback(() => {
    onCurrentIndexChange((prev) => (prev < totalMoves ? prev + 1 : prev));
  }, [totalMoves, onCurrentIndexChange]);

  const onSliderChange = useCallback(
    (value: number) => {
      onCurrentIndexChange(Math.round(value));
    },
    [onCurrentIndexChange],
  );

  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === totalMoves;
  const isSliderDisabled = totalMoves === 0;

  // 分析データが存在するか判定
  const scoreLeads = analysis?.perMove
    ? analysis.perMove.map((entry) => entry?.scoreLead ?? null)
    : [];
  const analyzedValues = scoreLeads.filter((v): v is number => v != null);
  const hasAnalysis = analyzedValues.length > 0;

  // 🐱【x軸ぴったり調整】スライダーの端の余白分を引いた実効横幅を計算する
  const usableWidth = Math.max(0, containerWidth - SLIDER_INSET * 2);

  const maxAbs = Math.max(MIN_RANGE, ...analyzedValues.map((v) => Math.abs(v)));
  const xStep = totalMoves > 0 ? usableWidth / totalMoves : 0;
  const availableHeight = CHART_HEIGHT - PADDING_Y * 2;
  const centerY = CHART_HEIGHT / 2;

  const toY = (v: number) => centerY - (v / maxAbs) * (availableHeight / 2);

  // グラフの各点のx座標に SLIDER_INSET を足して、スライダーのつまみとぴったり重なるようにする
  const validPoints: { x: number; y: number }[] = [];
  scoreLeads.forEach((v, i) => {
    if (v != null) {
      validPoints.push({ x: SLIDER_INSET + i * xStep, y: toY(v) });
    }
  });

  const firstX = validPoints.length > 0 ? validPoints[0].x : SLIDER_INSET;
  const lastX =
    validPoints.length > 0
      ? validPoints[validPoints.length - 1].x
      : containerWidth - SLIDER_INSET;

  const linePathD = createSmoothPath(validPoints);
  const bottomPathD =
    validPoints.length > 0
      ? `${linePathD} L ${lastX},${CHART_HEIGHT} L ${firstX},${CHART_HEIGHT} Z`
      : "";

  const currentPointX = SLIDER_INSET + currentIndex * xStep;
  const currentScore = scoreLeads[currentIndex];
  const currentPointY = currentScore != null ? toY(currentScore) : centerY;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.row}>
        {/* 左ボタン ◀︎ */}
        <TouchableOpacity
          style={[styles.button, { opacity: isAtStart ? 0.4 : 1.0 }]}
          onPress={onPrevious}
          disabled={isAtStart}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>◀</Text>
        </TouchableOpacity>

        {/* 中央エリア（グラフ＋バー＋つまみを重ね合わせ） */}
        <View style={styles.centerArea} onLayout={onLayout}>
          {containerWidth > 0 && (
            <View style={styles.overlayContainer}>
              {/* 背景のグラフ（データがある時だけ表示） */}
              {showScoreLeadGraph && hasAnalysis && (
                <View style={StyleSheet.absoluteFill}>
                  <Svg width={containerWidth} height={CHART_HEIGHT}>
                    {/* 下側の面 */}
                    {bottomPathD.length > 0 && (
                      <Path
                        d={bottomPathD}
                        fill={COLORS.primary}
                        opacity={0.6}
                      />
                    )}

                    {/* グラフの線 */}
                    {linePathD.length > 0 && (
                      <Path
                        d={linePathD}
                        fill="none"
                        stroke={COLORS.darkObjectAccent}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* 現在位置の点（グラフ上の丸） */}
                    <Circle
                      cx={currentPointX}
                      cy={currentPointY}
                      r={4}
                      fill={COLORS.foreground}
                      stroke={COLORS.primaryDark}
                      strokeWidth={1.5}
                    />
                  </Svg>
                </View>
              )}

              {/* 🐱 常に表示されるスライダーバー（棒＋つまみ） */}
              <Slider
                style={styles.slider}
                disabled={isSliderDisabled}
                minimumValue={0}
                maximumValue={totalMoves}
                step={1}
                value={currentIndex}
                onValueChange={onSliderChange}
                // グラフがあろうがなかろうが、常に同じ棒（バー）を表示する
                minimumTrackTintColor={`${COLORS.darkObject}90`}
                maximumTrackTintColor={`${COLORS.primaryDark}90`}
                thumbTintColor={`${COLORS.darkObject}E0`}
              />
            </View>
          )}
        </View>

        {/* 右ボタン ▶︎ */}
        <TouchableOpacity
          style={[styles.button, { opacity: isAtEnd ? 0.4 : 1.0 }]}
          onPress={onNext}
          disabled={isAtEnd}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.backgroundDark,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    flexShrink: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.darkObject,
  },
  centerArea: {
    flex: 1,
    height: CHART_HEIGHT,
    justifyContent: "center",
  },
  overlayContainer: {
    height: CHART_HEIGHT,
    width: "100%",
    justifyContent: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
  slider: {
    width: "100%",
    height: CHART_HEIGHT,
  },
});
