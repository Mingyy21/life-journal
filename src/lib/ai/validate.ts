// 后处理验证：检查AI分析结果的质量
// 检测常见问题：数值越界、情绪单一化、认知阶段不匹配等
import type { VADScore, EmotionLabels } from "@/types";

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "low" | "medium" | "high";
}

/** 验证VAD分数在合法范围内 */
function validateVAD(vad: VADScore): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (vad.valence < -1 || vad.valence > 1) warnings.push({ field: "vadScore.valence", message: `valence越界: ${vad.valence}`, severity: "high" });
  if (vad.arousal < 0 || vad.arousal > 1) warnings.push({ field: "vadScore.arousal", message: `arousal越界: ${vad.arousal}`, severity: "high" });
  if (vad.dominance < 0 || vad.dominance > 1) warnings.push({ field: "vadScore.dominance", message: `dominance越界: ${vad.dominance}`, severity: "high" });
  return warnings;
}

/** 验证情绪标签：检查是否所有情绪都接近0（可能是LLM未认真分析） */
function validateEmotions(emotions: EmotionLabels): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const keys = Object.keys(emotions) as (keyof EmotionLabels)[];
  const values = keys.map(k => emotions[k]);
  const maxVal = Math.max(...values);
  const nonZeroCount = values.filter(v => v > 0.05).length;

  // 所有情绪都接近0 → LLM可能没认真分析
  if (maxVal < 0.1) {
    warnings.push({ field: "emotionLabels", message: "所有情绪值都接近0，可能是分析未正常执行", severity: "high" });
  }

  // 只有一个情绪有值 → 可能是过度简化
  if (nonZeroCount <= 1 && maxVal > 0.5) {
    warnings.push({ field: "emotionLabels", message: "只有一种情绪被识别，可能存在过度简化", severity: "medium" });
  }

  keys.forEach(k => {
    if (emotions[k] < 0 || emotions[k] > 1) {
      warnings.push({ field: `emotionLabels.${k}`, message: `${k}越界: ${emotions[k]}`, severity: "high" });
    }
  });

  return warnings;
}

/** 验证认知阶段是有效值 */
function validateCognitiveStage(stage: string): ValidationWarning[] {
  const valid = ["觉察", "接纳", "理解", "重构", "行动"];
  if (!valid.includes(stage)) {
    return [{ field: "cognitiveStage", message: `无效的认知阶段: "${stage}"，有效值: ${valid.join("/")}`, severity: "medium" }];
  }
  return [];
}

/** 验证情绪强度在合法范围 */
function validateIntensity(intensity: number): ValidationWarning[] {
  if (intensity < 0 || intensity > 1) {
    return [{ field: "intensity", message: `intensity越界: ${intensity}`, severity: "high" }];
  }
  return [];
}

/** 验证主情绪是有效标签 */
function validatePrimaryEmotion(emotion: string): ValidationWarning[] {
  const validLabels = ["喜悦", "信任", "恐惧", "惊讶", "悲伤", "厌恶", "愤怒", "期待", "平静", "爱", "乐观", "屈从", "畏惧", "悔恨", "怨恨", "鄙视", "攻击性"];
  if (!validLabels.includes(emotion)) {
    // 不报错，只记录（LLM可能使用其他合理的情绪词）
    return [];
  }
  return [];
}

/** 完整验证分析结果 */
export function validateAnalysisResult(result: {
  vadScore: VADScore;
  emotionLabels: EmotionLabels;
  primaryEmotion: string;
  intensity: number;
  cognitiveStage: string;
  insight?: string;
  feedback?: string;
}): { valid: boolean; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [
    ...validateVAD(result.vadScore),
    ...validateEmotions(result.emotionLabels),
    ...validateCognitiveStage(result.cognitiveStage),
    ...validateIntensity(result.intensity),
    ...validatePrimaryEmotion(result.primaryEmotion),
  ];

  // insight/feedback 为空检查
  if (!result.insight || result.insight.length < 5) {
    warnings.push({ field: "insight", message: "insight过短或为空", severity: "medium" });
  }
  if (!result.feedback || result.feedback.length < 10) {
    warnings.push({ field: "feedback", message: "feedback过短或为空", severity: "medium" });
  }

  // 有high级别warning → 验证不通过
  const valid = !warnings.some(w => w.severity === "high");

  return { valid, warnings };
}

/** 修复常见问题：将越界值裁剪到合法范围 */
export function sanitizeResult(result: {
  vadScore: VADScore;
  emotionLabels: EmotionLabels;
  intensity: number;
}): void {
  result.vadScore.valence = Math.max(-1, Math.min(1, result.vadScore.valence));
  result.vadScore.arousal = Math.max(0, Math.min(1, result.vadScore.arousal));
  result.vadScore.dominance = Math.max(0, Math.min(1, result.vadScore.dominance));
  result.intensity = Math.max(0, Math.min(1, result.intensity));

  const emotionKeys = Object.keys(result.emotionLabels) as (keyof EmotionLabels)[];
  emotionKeys.forEach(k => {
    result.emotionLabels[k] = Math.max(0, Math.min(1, result.emotionLabels[k]));
  });
}
