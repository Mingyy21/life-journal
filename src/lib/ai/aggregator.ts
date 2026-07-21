// 汇总Agent — 将多个专业Agent的输出合并为统一的AnalysisOutput
// 纯本地逻辑，不调用LLM，零延迟
import type { VADScore, EmotionLabels } from "@/types";
import type { AgentType, AnalysisOutput } from "./types";
import type { SpecialistOutput } from "./specialists";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 按ID查找专业Agent的输出 */
function findOutput(outputs: SpecialistOutput[], id: string): SpecialistOutput | undefined {
  return outputs.find(o => o.specialistId === id && o.success);
}

/** 安全取嵌套字段，缺失返回undefined */
function safeGet(obj: unknown, ...path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// ── 各维度提取函数 ──

function extractVAD(outputs: SpecialistOutput[], fallback: VADScore): VADScore {
  const emo = findOutput(outputs, "emotion-analyst");
  if (!emo?.data.vadScore || typeof emo.data.vadScore !== "object") return fallback;
  const vs = emo.data.vadScore as Record<string, unknown>;
  return {
    valence: clamp(typeof vs.valence === "number" ? vs.valence : fallback.valence, -1, 1),
    arousal: clamp(typeof vs.arousal === "number" ? vs.arousal : fallback.arousal, 0, 1),
    dominance: clamp(typeof vs.dominance === "number" ? vs.dominance : fallback.dominance, 0, 1),
  };
}

function extractEmotions(outputs: SpecialistOutput[], fallback: EmotionLabels): EmotionLabels {
  const emo = findOutput(outputs, "emotion-analyst");
  const keys: (keyof EmotionLabels)[] = ["joy","trust","fear","surprise","sadness","disgust","anger","anticipation"];
  const result = { ...fallback };

  if (!emo?.data.emotionLabels || typeof emo.data.emotionLabels !== "object") return result;
  const labels = emo.data.emotionLabels as Record<string, unknown>;

  for (const k of keys) {
    result[k] = clamp(typeof labels[k] === "number" ? labels[k] : fallback[k], 0, 1);
  }
  return result;
}

function extractPrimaryEmotion(outputs: SpecialistOutput[], fallback: string): string {
  const emo = findOutput(outputs, "emotion-analyst");
  return (typeof emo?.data.primaryEmotion === "string" ? emo.data.primaryEmotion : null) || fallback;
}

function extractIntensity(outputs: SpecialistOutput[], fallback: number): number {
  const emo = findOutput(outputs, "emotion-analyst");
  return clamp(typeof emo?.data.intensity === "number" ? emo.data.intensity : fallback, 0, 1);
}

function extractCognitiveStage(outputs: SpecialistOutput[], fallback: string): string {
  const cog = findOutput(outputs, "cognitive-detector");
  return (typeof cog?.data.cognitiveStage === "string" ? cog.data.cognitiveStage : null) || fallback;
}

function extractInsight(outputs: SpecialistOutput[], fallback: string): string {
  const nar = findOutput(outputs, "narrative-reframer");
  return (typeof nar?.data.insight === "string" ? nar.data.insight : null) || fallback;
}

function extractFeedback(outputs: SpecialistOutput[], fallback: string): string {
  const act = findOutput(outputs, "action-advisor");
  return (typeof act?.data.feedback === "string" ? act.data.feedback : null) || fallback;
}

function extractFollowUpQuestion(outputs: SpecialistOutput[], fallback: string): string {
  const act = findOutput(outputs, "action-advisor");
  return (typeof act?.data.followUpQuestion === "string" ? act.data.followUpQuestion : null) || fallback;
}

// ── 主汇总函数 ──

export interface AggregationInput {
  specialistOutputs: SpecialistOutput[];
  /** 预标注中的话题检测结果 */
  fallbackTopics: string[];
  /** 预标注中的标签（情绪关键词） */
  fallbackTags: string[];
  fallbackVAD: VADScore;
  fallbackEmotions: EmotionLabels;
  fallbackStage: string;
  fallbackPrimaryEmotion: string;
  fallbackIntensity: number;
  fallbackInsight: string;
  fallbackFeedback: string;
  fallbackFollowUp: string;
}

export function aggregateResults(input: AggregationInput): {
  vadScore: VADScore;
  emotionLabels: EmotionLabels;
  primaryEmotion: string;
  intensity: number;
  cognitiveStage: string;
  topics: string[];
  tags: string[];
  insight: string;
  feedback: string;
  followUpQuestion: string;
  /** 附带的专业Agent原始输出（供调试和前端展示） */
  debug: {
    specialistCount: number;
    successCount: number;
    failedCount: number;
    specialistDetails: { id: string; name: string; success: boolean; duration: number }[];
  };
} {
  const { specialistOutputs, fallbackTopics, fallbackTags, fallbackVAD, fallbackEmotions, fallbackStage, fallbackPrimaryEmotion, fallbackIntensity, fallbackInsight, fallbackFeedback, fallbackFollowUp } = input;

  const successCount = specialistOutputs.filter(o => o.success).length;
  const failedCount = specialistOutputs.filter(o => !o.success).length;

  // 从各专业Agent提取结果
  const vadScore = extractVAD(specialistOutputs, fallbackVAD);
  const emotionLabels = extractEmotions(specialistOutputs, fallbackEmotions);
  const primaryEmotion = extractPrimaryEmotion(specialistOutputs, fallbackPrimaryEmotion);
  const intensity = extractIntensity(specialistOutputs, fallbackIntensity);
  const cognitiveStage = extractCognitiveStage(specialistOutputs, fallbackStage);
  const insight = extractInsight(specialistOutputs, fallbackInsight);
  const feedback = extractFeedback(specialistOutputs, fallbackFeedback);
  const followUpQuestion = extractFollowUpQuestion(specialistOutputs, fallbackFollowUp);

  // 话题和标签取并集：专业Agent检测到的 + 本地预标注的
  const topics = new Set(fallbackTopics);
  const tags = new Set(fallbackTags);

  // 如果能从分析结果中提取额外的话题，加入
  for (const output of specialistOutputs) {
    if (!output.success) continue;
    const extraTopics = safeGet(output.data, "topics");
    if (Array.isArray(extraTopics)) {
      extraTopics.filter((t): t is string => typeof t === "string").slice(0, 3).forEach(t => topics.add(t));
    }
    const extraTags = safeGet(output.data, "tags");
    if (Array.isArray(extraTags)) {
      extraTags.filter((t): t is string => typeof t === "string").slice(0, 3).forEach(t => tags.add(t));
    }
  }

  return {
    vadScore,
    emotionLabels,
    primaryEmotion,
    intensity,
    cognitiveStage,
    topics: [...topics].slice(0, 4),
    tags: [...tags].slice(0, 4),
    insight,
    feedback,
    followUpQuestion,
    debug: {
      specialistCount: specialistOutputs.length,
      successCount,
      failedCount,
      specialistDetails: specialistOutputs.map(o => ({
        id: o.specialistId,
        name: o.specialistName,
        success: o.success,
        duration: o.duration,
      })),
    },
  };
}
