// 人生手记 - 类型定义 v0.4

/** 解决状态：标记事件的处理阶段 */
export type ResolutionStatus = "unresolved" | "in_progress" | "avoiding" | "accepted" | "resolved";

/** 一级标签：人生大课题领域 */
export interface LifeDomain {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  order: number;
}

/** 二级标签：需要具体面对和解决的小课题 */
export interface Topic {
  id: string;
  name: string;
  domainId: string;
  color: string;
  icon: string;
  description: string;
  diaryCount: number;
  createdAt: Date;
}

/** 事件：课题下的具体事情，有处理生命周期 */
export interface Event {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  resolutionStatus: ResolutionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** 感悟：独立存在的领悟，可关联多个事件和课题 */
export interface Insight {
  id: string;
  title: string;
  content: string;
  linkedEventIds: string[];
  linkedTopicIds: string[];
  sourceDiaryId?: string;
  createdAt: Date;
}

/** VAD三维情绪模型 */
export interface VADScore {
  valence: number;
  arousal: number;
  dominance: number;
}

/** Plutchik八情绪轮 */
export interface EmotionLabels {
  joy: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
}

/** AI分析结果 */
export interface AnalysisResult {
  id: string;
  diaryId: string;
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
  createdAt: Date;
}

/** 日记记录（原子单位，可关联事件或作为日常） */
export interface Diary {
  id: string;
  title: string;
  content: string;
  topicIds: string[];
  eventId: string | null;
  analysisId: string | null;
  hasAnalysis: boolean;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDiaryInput {
  title: string;
  content: string;
  topicIds: string[];
  eventId: string | null;
}

export interface UpdateDiaryInput {
  title?: string;
  content?: string;
  topicIds?: string[];
  eventId?: string | null;
}

export interface CreateEventInput {
  topicId: string;
  title: string;
  description?: string;
  resolutionStatus: ResolutionStatus;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  resolutionStatus?: ResolutionStatus;
}

export interface CreateInsightInput {
  title: string;
  content: string;
  linkedEventIds: string[];
  linkedTopicIds: string[];
  sourceDiaryId?: string;
}

export interface DiaryFilter {
  domainId?: string;
  topicId?: string;
  eventId?: string;
  resolutionStatus?: ResolutionStatus;
  hasAnalysis?: boolean;
  keyword?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface EventFilter {
  topicId?: string;
  resolutionStatus?: ResolutionStatus;
}

export interface InsightFilter {
  linkedEventId?: string;
  linkedTopicId?: string;
}
