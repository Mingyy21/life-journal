import type { Diary, AnalysisResult } from "@/types";
import { COGNITIVE_STAGE_WORDS } from "@/lib/ai";

export type CognitiveStage = "觉察" | "接纳" | "理解" | "重构" | "行动";

export const STAGE_ORDER: CognitiveStage[] = ["觉察", "接纳", "理解", "重构", "行动"];

export interface EvolutionPoint {
  date: Date;
  stage: CognitiveStage;
  stageIndex: number;
  diaryId: string;
  diaryTitle: string;
}

export interface EvolutionData {
  points: EvolutionPoint[];
  stages: CognitiveStage[];
}

function detectCognitiveStage(text: string): CognitiveStage {
  let bestStage: CognitiveStage = "觉察";
  let bestScore = 0;
  for (const [stage, words] of Object.entries(COGNITIVE_STAGE_WORDS)) {
    const score = words.filter(w => text.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestStage = stage as CognitiveStage; }
  }
  return bestStage;
}

export function getCognitiveEvolution(
  diaries: Diary[],
  analysisMap: Map<string, AnalysisResult>
): EvolutionData {
  const points: EvolutionPoint[] = [];

  for (const diary of diaries) {
    const analysis = analysisMap.get(diary.id);
    let stage: CognitiveStage;
    if (analysis) {
      stage = analysis.cognitiveStage as CognitiveStage;
    } else {
      stage = detectCognitiveStage(diary.title + diary.content);
    }
    points.push({
      date: diary.createdAt,
      stage,
      stageIndex: STAGE_ORDER.indexOf(stage),
      diaryId: diary.id,
      diaryTitle: diary.title,
    });
  }

  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { points, stages: STAGE_ORDER };
}
