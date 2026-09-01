// ScoreLeadChart.tsx
import { RecordAnalysis } from "@/src/active/types/analysis";
import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
// ★ Path を追加した！
import Svg, { Circle, Line, Path } from "react-native-svg";

type ScoreLeadChartProps = {
  analysis: RecordAnalysis;
  currentIndex: number;
  totalMoves: number;
  analyzedCount: number;
  isAnalyzing: boolean;
  onToggle: () => void;
};

const CHART_HEIGHT = 140;
const PADDING_Y = 16;
const MIN_RANGE = 5;

// ★ 点と点を滑らかなカーブ（曲線）でつなぐ関数
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    // 滑らかにするためのコントロールポイント（ガイドの点）の計算
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

export function ScoreLeadChart({
  analysis,
  currentIndex,
  totalMoves,
  analyzedCount,
  isAnalyzing,
  onToggle,
}: ScoreLeadChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  if (totalMoves === 0 || width === 0) {
    return (
      <View className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <View onLayout={onLayout} style={{ height: CHART_HEIGHT }} />
      </View>
    );
  }

  const scoreLeads = analysis.perMove.map((entry) => entry?.scoreLead ?? null);
  const analyzedValues = scoreLeads.filter((v): v is number => v != null);
  const maxAbs = Math.max(MIN_RANGE, ...analyzedValues.map((v) => Math.abs(v)));

  const xStep = width / Math.max(totalMoves - 1, 1);
  const availableHeight = CHART_HEIGHT - PADDING_Y * 2;
  const centerY = CHART_HEIGHT / 2;

  const toY = (v: number) => centerY - (v / maxAbs) * (availableHeight / 2);

  const validPoints = scoreLeads
    .map((v, i) => (v != null ? { x: i * xStep, y: toY(v) } : null))
    .filter((p): p is { x: number; y: number } => p != null);

  const firstX = validPoints.length > 0 ? validPoints[0].x : 0;
  const lastX =
    validPoints.length > 0 ? validPoints[validPoints.length - 1].x : 0;

  // ★ 滑らかな折れ線パスを作る！
  const linePathD = createSmoothPath(validPoints);

  // ★ 上下の塗りつぶし用パス（滑らかな線を通って上端・下端で閉じる）
  const topPathD =
    validPoints.length > 0 ? `${linePathD} L ${lastX},0 L ${firstX},0 Z` : "";

  const bottomPathD =
    validPoints.length > 0
      ? `${linePathD} L ${lastX},${CHART_HEIGHT} L ${firstX},${CHART_HEIGHT} Z`
      : "";

  const markerMoveIndex = currentIndex - 1;
  const markerEntry =
    markerMoveIndex >= 0 ? analysis.perMove[markerMoveIndex] : null;
  const isDone = analyzedCount >= totalMoves;

  return (
    <View className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
      <View
        onLayout={onLayout}
        style={{ height: CHART_HEIGHT }}
        className="relative overflow-hidden rounded-xl bg-slate-950"
      >
        <Svg width={width} height={CHART_HEIGHT}>
          {/* 上側の面（白） */}
          {topPathD.length > 0 && <Path d={topPathD} fill="#f1f5f9" />}

          {/* 下側の面（黒） */}
          {bottomPathD.length > 0 && <Path d={bottomPathD} fill="#090d16" />}

          {/* 中央のゼロライン（基準線） */}
          <Line
            x1={0}
            y1={centerY}
            x2={width}
            y2={centerY}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* 境界となる滑らかな線 */}
          {linePathD.length > 0 && (
            <Path
              d={linePathD}
              fill="none"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* マーカー（現在の指し手位置） */}
          {markerEntry && markerEntry.scoreLead != null && (
            <>
              <Line
                x1={markerMoveIndex * xStep}
                y1={0}
                x2={markerMoveIndex * xStep}
                y2={CHART_HEIGHT}
                stroke="#38bdf8"
                strokeWidth={1.5}
              />
              <Circle
                cx={markerMoveIndex * xStep}
                cy={toY(markerEntry.scoreLead)}
                r={5}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </>
          )}
        </Svg>

        {/* オーバーレイ */}
        {!isDone && (
          <Pressable
            onPress={onToggle}
            className="absolute inset-0 items-center justify-center bg-slate-950/80 active:bg-slate-950/90"
          >
            {isAnalyzing ? (
              <View className="items-center bg-slate-900/90 px-4 py-2.5 rounded-full border border-slate-700 shadow-md">
                <ActivityIndicator color="#38bdf8" size="small" />
                <Text className="text-xs font-semibold text-slate-200 mt-1">
                  解析中… {analyzedCount} / {totalMoves} 手
                </Text>
              </View>
            ) : (
              <View className="items-center bg-slate-800/90 px-4 py-2.5 rounded-full border border-slate-600 shadow-md flex-row space-x-2">
                <Text className="text-xs text-slate-100 font-bold">▶</Text>
                <Text className="text-xs font-semibold text-slate-100">
                  {analyzedCount > 0
                    ? `続きから解析 (${analyzedCount} / ${totalMoves} 手)`
                    : "タップして解析を開始"}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
