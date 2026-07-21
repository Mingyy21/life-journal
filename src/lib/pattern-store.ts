// 个人模式库 v1.0
// 被动模式识别：解决路径提取、类似情境匹配、预警检测、成长里程碑
// 参考：Self-Growing Memory Network (Guo et al., 2025) — 成功经验+失败经验双通道

import { db } from "@/lib/db";
import type { Diary, Event, Insight, AnalysisResult, VADScore, EmotionLabels } from "@/types";

// ── 类型定义 ──

export interface ResolutionPath {
  eventId: string;
  eventTitle: string;
  topicId: string;
  /** 情绪变化序列 */
  emotionTrajectory: { date: string; valence: number; primaryEmotion: string }[];
  /** 认知阶段演化 */
  stageEvolution: { from: string; to: string }[];
  /** 关键转折日记 */
  turningPointDiary?: { id: string; title: string; date: string };
  /** 解决耗时(天) */
  resolvedInDays: number;
}

export interface SimilarSituation {
  currentDiaryId: string;
  matchedDiary: { id: string; title: string; date: string; score: number };
  resolutionPath?: ResolutionPath;
  suggestedInsight: string;
}

export interface PatternAlert {
  type: "warning" | "similar_situation" | "milestone";
  topicId?: string;
  topicName?: string;
  message: string;
  suggestion?: string;
  link?: string;
}

export interface GrowthMilestone {
  topicId: string;
  topicName: string;
  /** 完整认知阶段演化 */
  stages: string[];
  /** 从觉察到行动的天数 */
  totalDays: number;
  /** 最后一次行动日记 */
  lastActionDiary: { id: string; title: string; date: string };
}

// ── 解决路径提取 ──

/** 为已解决/已接纳的事件提取解决路径 */
export async function extractResolutionPath(eventId: string): Promise<ResolutionPath | null> {
  const event = await db.events.get(eventId);
  if (!event) return null;
  if (event.resolutionStatus !== "resolved" && event.resolutionStatus !== "accepted") return null;

  // 获取该事件关联的所有日记
  const diaries = await db.diaries.where("eventId").equals(eventId).sortBy("createdAt");
  if (diaries.length < 2) return null;

  // 获取分析记录
  const analyses = await db.analysisResults.toArray();
  const analysisMap = new Map(analyses.map(a => [a.diaryId, a]));

  // 提取情绪变化序列
  const emotionTrajectory: ResolutionPath["emotionTrajectory"] = [];
  for (const d of diaries) {
    const a = analysisMap.get(d.id);
    if (a) {
      emotionTrajectory.push({
        date: d.createdAt.toISOString().slice(0, 10),
        valence: a.vadScore.valence,
        primaryEmotion: a.primaryEmotion,
      });
    }
  }

  // 提取认知阶段演化
  const stages = diaries
    .map(d => analysisMap.get(d.id))
    .filter(Boolean)
    .map(a => a!.cognitiveStage);
  const uniqueStages = [...new Set(stages)];
  const stageEvolution: ResolutionPath["stageEvolution"] = [];
  for (let i = 1; i < uniqueStages.length; i++) {
    stageEvolution.push({ from: uniqueStages[i - 1], to: uniqueStages[i] });
  }

  // 找关键转折日记（valence从负转正的那篇）
  let turningPointDiary: ResolutionPath["turningPointDiary"] | undefined;
  for (let i = 1; i < emotionTrajectory.length; i++) {
    if (emotionTrajectory[i - 1].valence < 0 && emotionTrajectory[i].valence > 0) {
      const d = diaries[diaries.length - emotionTrajectory.length + i];
      turningPointDiary = {
        id: d.id,
        title: d.title,
        date: d.createdAt.toISOString().slice(0, 10),
      };
      break;
    }
  }

  const firstDate = diaries[0].createdAt.getTime();
  const lastDate = diaries[diaries.length - 1].createdAt.getTime();

  return {
    eventId: event.id,
    eventTitle: event.title,
    topicId: event.topicId,
    emotionTrajectory,
    stageEvolution,
    turningPointDiary,
    resolvedInDays: Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)),
  };
}

// ── 类似情境匹配 ──

/** 检测与当前日记最相似的历史事件，特别是已解决的 */
export async function findSimilarResolvedSituation(
  currentDiary: Diary,
  similarityThreshold = 0.3
): Promise<SimilarSituation | null> {
  // 获取所有已解决/已接纳的事件关联的日记
  const resolvedEvents = await db.events
    .filter(e => e.resolutionStatus === "resolved" || e.resolutionStatus === "accepted")
    .toArray();
  const resolvedEventIds = new Set(resolvedEvents.map(e => e.id));

  const allDiaries = await db.diaries.toArray();
  const candidateDiaries = allDiaries.filter(d => d.eventId && resolvedEventIds.has(d.eventId));

  if (candidateDiaries.length === 0) return null;

  // 简易Jaccard相似度匹配
  const tokenize = (text: string) => {
    const cleaned = text.replace(/[，。！？、；：""''（）《》【】\s\n\r]+/g, " ").trim();
    return new Set(cleaned.split(" ").filter(w => w.length >= 2));
  };
  const currentTokens = tokenize(currentDiary.title + " " + currentDiary.content);

  let bestMatch: SimilarSituation | null = null;
  let bestScore = 0;

  for (const candidate of candidateDiaries) {
    const candidateTokens = tokenize(candidate.title + " " + candidate.content);
    const intersection = new Set([...currentTokens].filter(x => candidateTokens.has(x)));
    const union = new Set([...currentTokens, ...candidateTokens]);
    const score = union.size === 0 ? 0 : intersection.size / union.size;

    if (score > similarityThreshold && score > bestScore) {
      bestScore = score;
      // 从日记原文中提取解决线索
      const resolutionPath = await extractResolutionPath(candidate.eventId!);
      const suggestedInsight = resolutionPath
        ? `你上次在「${resolutionPath.eventTitle}」中经历了类似感受，通过${resolutionPath.stageEvolution.map(s => s.from + "→" + s.to).join("、")}的认知成长，${resolutionPath.resolvedInDays}天后走出了这段情绪。`
        : `你之前有一篇相关记录「${candidate.title}」，后来这件事得到了解决。`;

      bestMatch = {
        currentDiaryId: currentDiary.id,
        matchedDiary: {
          id: candidate.id,
          title: candidate.title,
          date: candidate.createdAt.toISOString().slice(0, 10),
          score: Math.round(score * 100) / 100,
        },
        resolutionPath: resolutionPath || undefined,
        suggestedInsight,
      };
    }
  }

  return bestMatch;
}

// ── 预警检测 ──

/** 检测同一课题是否有持续负向情绪（连续≥3篇valence<0） */
export async function detectWarningSignals(diary?: Diary): Promise<PatternAlert[]> {
  const alerts: PatternAlert[] = [];
  const allDiaries = await db.diaries.orderBy("createdAt").reverse().toArray();
  const analyses = await db.analysisResults.toArray();
  const analysisMap = new Map(analyses.map(a => [a.diaryId, a]));

  // 按课题分组
  const byTopic = new Map<string, Diary[]>();
  for (const d of allDiaries) {
    for (const tid of d.topicIds || []) {
      if (!byTopic.has(tid)) byTopic.set(tid, []);
      byTopic.get(tid)!.push(d);
    }
  }

  // 检查每个课题最近3篇日记的情绪
  for (const [topicId, topicDiaries] of byTopic) {
    const sorted = topicDiaries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const recent3 = sorted.slice(0, 3);
    if (recent3.length < 3) continue;

    const withAnalysis = recent3.filter(d => analysisMap.has(d.id));
    if (withAnalysis.length < 3) continue;

    const allNegative = withAnalysis.every(d => {
      const a = analysisMap.get(d.id)!;
      return a.vadScore.valence < 0;
    });

    if (allNegative) {
      const topic = await db.topics.get(topicId);
      alerts.push({
        type: "warning",
        topicId,
        topicName: topic?.name || "未知课题",
        message: `课题"${topic?.name || "未知课题"}"最近3篇日记情绪持续低落，要聊聊吗？`,
        suggestion: "也许可以试着写一篇关于'这个课题让你学到了什么'的反思日记",
        link: `/topics/${topicId}`,
      });
    }
  }

  return alerts;
}

// ── 成长里程碑检测 ──

/** 检测认知阶段的完整演化路径（觉察→接纳→理解→重构→行动） */
export async function detectGrowthMilestones(): Promise<GrowthMilestone[]> {
  const milestones: GrowthMilestone[] = [];
  const diaries = await db.diaries.toArray();
  const analyses = await db.analysisResults.toArray();
  const analysisMap = new Map(analyses.map(a => [a.diaryId, a]));

  // 按课题分组，检查认知阶段序列
  const byTopic = new Map<string, Diary[]>();
  for (const d of diaries) {
    for (const tid of d.topicIds || []) {
      if (!byTopic.has(tid)) byTopic.set(tid, []);
      byTopic.get(tid)!.push(d);
    }
  }

  const STAGE_ORDER = ["觉察", "接纳", "理解", "重构", "行动"];

  for (const [topicId, topicDiaries] of byTopic) {
    const sorted = topicDiaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const stages: string[] = [];
    let lastActionDiary: GrowthMilestone["lastActionDiary"] | null = null;

    for (const d of sorted) {
      const a = analysisMap.get(d.id);
      if (!a) continue;
      const idx = STAGE_ORDER.indexOf(a.cognitiveStage);
      if (idx === -1) continue;
      if (stages.length === 0 || STAGE_ORDER.indexOf(stages[stages.length - 1]) < idx) {
        stages.push(a.cognitiveStage);
      }
      if (a.cognitiveStage === "行动") {
        lastActionDiary = { id: d.id, title: d.title, date: d.createdAt.toISOString().slice(0, 10) };
      }
    }

    // 需要至少3个不同的阶段（如觉察→理解→行动）
    if (stages.length >= 3 && lastActionDiary) {
      const firstDate = sorted[0].createdAt.getTime();
      const lastDate = lastActionDiary ? new Date(lastActionDiary.date).getTime() : Date.now();
      const topic = await db.topics.get(topicId);

      milestones.push({
        topicId,
        topicName: topic?.name || "未知课题",
        stages,
        totalDays: Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)),
        lastActionDiary: lastActionDiary!,
      });
    }
  }

  return milestones;
}

/** 综合检测：运行所有模式检测，返回全部Alert */
export async function runAllPatternChecks(currentDiary?: Diary): Promise<PatternAlert[]> {
  const allAlerts: PatternAlert[] = [];

  // 1. 预警检测
  const warnings = await detectWarningSignals(currentDiary);
  allAlerts.push(...warnings);

  // 2. 成长里程碑（只在有数据但无预警时显示，避免信息过载）
  if (allAlerts.length === 0) {
    const milestones = await detectGrowthMilestones();
    if (milestones.length > 0) {
      const latest = milestones[milestones.length - 1];
      allAlerts.push({
        type: "milestone",
        topicId: latest.topicId,
        topicName: latest.topicName,
        message: `在课题"${latest.topicName}"中，你经历了 ${latest.stages.join(" → ")} 的完整认知成长，历时${latest.totalDays}天。`,
        suggestion: "这是你内在力量的真实证明，值得庆祝。",
        link: `/topics/${latest.topicId}`,
      });
    }
  }

  return allAlerts;
}
