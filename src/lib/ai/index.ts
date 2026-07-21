// AI分析Pipeline v2.0 — 统一导出
// 并行多Agent架构：预标注 → RAG检索 → 5专业Agent并行 → 汇总 → 验证

export { runPipeline, setApiCall } from "./pipeline";
export type { ApiCallFn } from "./pipeline";

export { preAnnotate, preAnnotationToPrompt } from "./preannotate";
export { retrieveSimilar, getEmotionTrend, retrievalToPrompt } from "./retrieve";

// 专业Agent系统（v2.0新增）
export { runParallelAnalysis, buildSpecialistMessages, setApiCall as setSpecialistApiCall } from "./specialists";
export { SPECIALISTS, EMOTION_ANALYST, COGNITIVE_DETECTOR, PATTERN_RECOGNIZER, NARRATIVE_REFARMER, ACTION_ADVISOR } from "./specialists";
export type { SpecialistConfig, SpecialistOutput, ParallelExecutionOptions, ApiCallOptions } from "./specialists";

// 汇总Agent（v2.0新增）
export { aggregateResults } from "./aggregator";
export type { AggregationInput } from "./aggregator";

// 纵向趋势分析（v2.1新增）
export { runTrendAnalysis, getWeekRange, getMonthRange, getYearRange, getTodayRange } from "./trend-pipeline";
export type { TrendScope, TrendReport } from "./trend-pipeline";

// 验证
export { validateAnalysisResult, sanitizeResult } from "./validate";

// 向后兼容
export { getAgent, buildAgentMessages, AGENTS } from "./agents";
export { getMockAnalysis } from "./analysis-local";

export type {
  PreAnnotation, RetrievedDiary, RetrievalResult, AgentResult,
  PipelineContext, AnalysisOutput, AgentType,
} from "./types";
export type { VADScore, EmotionLabels } from "./types";
export type { AgentConfig } from "./agents";
export type { ValidationWarning } from "./validate";
