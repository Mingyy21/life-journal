// AI Pipeline 类型定义 v1.0
import type { VADScore, EmotionLabels } from "@/types";
export type { VADScore, EmotionLabels };

/** 分析Agent类型 */
export type AgentType = "single" | "daily" | "weekly" | "monthly" | "yearly" | "pattern";

/** 预标注结果（本地规则引擎产出） */
export interface PreAnnotation {
  /** 匹配到的情绪词列表 */
  matchedWords: { word: string; label: string; weight: number }[];
  /** 粗略VAD估计 */
  roughVAD: VADScore;
  /** 粗略情绪标签 */
  roughEmotions: EmotionLabels;
  /** 检测到的认知阶段 */
  detectedStage: string;
  /** 检测到的课题 */
  detectedTopics: string[];
  /** 词库覆盖率（0-1），越高说明本地分析越可信 */
  coverage: number;
}

/** 检索到的相关日记 */
export interface RetrievedDiary {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  /** 相关性分数 0-1 */
  score: number;
  /** 匹配原因：topic / keyword / emotion */
  matchReason: string;
}

/** 检索结果 */
export interface RetrievalResult {
  /** 相似日记列表（按相关性排序） */
  similar: RetrievedDiary[];
  /** 历史情绪趋势（如果有分析记录） */
  emotionTrend?: { date: string; valence: number; primaryEmotion: string }[];
  /** 该课题的历史事件 */
  relatedEvents?: { id: string; title: string; status: string }[];
}

/** 单个Agent的分析结果 */
export interface AgentResult {
  agentType: AgentType;
  /** Agent名称 */
  agentName: string;
  /** 分析结论 */
  analysis: Record<string, unknown>;
  /** 耗时(ms) */
  duration: number;
  /** 是否使用了LLM */
  usedLLM: boolean;
}

/** Pipeline上下文（贯穿整个分析流程） */
export interface PipelineContext {
  diaryId?: string;
  title: string;
  content: string;
  topicIds: string[];
  userId?: string;
  /** 分析类型 */
  agentType: AgentType;
  /** 是否配置了API Key */
  hasAPIKey: boolean;
}

/** 最终分析输出 */
export interface AnalysisOutput {
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
  /** Pipeline元信息 */
  meta?: {
    /** 使用的Agent类型 */
    agentType: AgentType;
    /** 预标注覆盖率 */
    preAnnotationCoverage: number;
    /** 检索到的相似日记数 */
    retrievedCount: number;
    /** 是否降级为本地分析 */
    fallback: boolean;
    /** 总耗时(ms) */
    totalDuration: number;
    /** 类似历史情境匹配（v2.1 模式库） */
    similarPattern?: {
      matchedDiaryId: string;
      matchedDiaryTitle: string;
      similarityScore: number;
      insight: string;
    };
    /** 成长里程碑 */
    milestone?: {
      topicName: string;
      stages: string[];
      totalDays: number;
    };
  };
}
