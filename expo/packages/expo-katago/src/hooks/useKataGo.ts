// packages/expo-katago/src/hooks/useKataGo.ts
// KataGoEngineContextのrunAnalysisを、そのまま使う側に渡すだけの薄い層。
// 盤面フォーマットの変換はしない(使う側の責務)。推論中に呼ぶと null が返る。
import { useKataGoEngine } from "../components/KataGoEngineContext";

export const useKataGo = () => {
  const { runAnalysis, engineReady, isAnalyzing } = useKataGoEngine();
  return { run: runAnalysis, engineReady, isAnalyzing };
};