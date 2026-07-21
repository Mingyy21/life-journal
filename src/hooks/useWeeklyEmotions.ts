import type { Diary, AnalysisResult, EmotionLabels } from "@/types";
import { getMockAnalysis } from "@/lib/ai";

const EMPTY_EMOTIONS: EmotionLabels = { joy: 0, trust: 0, fear: 0, surprise: 0, sadness: 0, disgust: 0, anger: 0, anticipation: 0 };

export function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

export function aggregateWeeklyEmotions(
  diaries: Diary[],
  analyses: Map<string, AnalysisResult>
): EmotionLabels {
  if (diaries.length === 0) return { ...EMPTY_EMOTIONS };

  const { weekStart, weekEnd } = getCurrentWeekRange();
  const weekDiaries = diaries.filter(d => {
    const t = d.createdAt.getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  });

  if (weekDiaries.length === 0) return { ...EMPTY_EMOTIONS };

  const scores: EmotionLabels = { ...EMPTY_EMOTIONS };
  let count = 0;

  for (const diary of weekDiaries) {
    const analysis = analyses.get(diary.id);
    let emotionLabels: EmotionLabels;
    if (analysis) {
      emotionLabels = analysis.emotionLabels;
    } else {
      const mock = getMockAnalysis(diary.title, diary.content);
      emotionLabels = mock.emotionLabels;
    }
    for (const key of Object.keys(scores) as (keyof EmotionLabels)[]) {
      scores[key] += emotionLabels[key];
    }
    count++;
  }

  if (count > 0) {
    for (const key of Object.keys(scores) as (keyof EmotionLabels)[]) {
      scores[key] = scores[key] / count;
    }
  }

  return scores;
}
