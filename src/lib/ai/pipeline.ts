// AI分析Pipeline v2.0 — 并行多Agent架构
// 流程：预标注 → RAG检索 → 并行专业Agent分析 → 汇总 → 验证 → 输出
// 参考：Bunny双Agent(2025) + Self-Growing Memory(2025) + Nico五层对话地图

import { preAnnotate, preAnnotationToPrompt } from "./preannotate";
import { cnPreprocess, cnPreprocessToPrompt } from "./cn-preprocess";
import { retrieveSimilar, getEmotionTrend, retrievalToPrompt } from "./retrieve";
import { findSimilarResolvedSituation, detectGrowthMilestones } from "@/lib/pattern-store";
import { runParallelAnalysis, setApiCall, type ApiCallFn } from "./specialists";
import { aggregateResults } from "./aggregator";
import { validateAnalysisResult, sanitizeResult } from "./validate";
import type { AgentType, PipelineContext, AnalysisOutput, RetrievalResult } from "./types";
import type { VADScore, EmotionLabels } from "@/types";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hasAPIKey(): boolean {
  return !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "sk-your-api-key-here");
}

/** 注册自定义API调用函数（自研模型接入点） */
export { setApiCall };
export type { ApiCallFn };

// ── Pipeline主入口 ──

export async function runPipeline(context: PipelineContext): Promise<AnalysisOutput> {
  const startTime = Date.now();
  const { title, content, topicIds, agentType } = context;

  // ── 阶段1：本地预标注 + 中文预处理 ──
  const preAnnotation = preAnnotate(title, content);
  const cnResult = cnPreprocess(title + content);
  const preAnnoPrompt = preAnnotationToPrompt(preAnnotation) + "\n\n" + cnPreprocessToPrompt(cnResult);

  // ── 阶段2：RAG检索历史相关日记 ──
  const similar = await retrieveSimilar(title, content, topicIds);
  const emotionTrend = await getEmotionTrend(topicIds);
  const retrievalResult: RetrievalResult = { similar, emotionTrend };
  const retrievalPrompt = retrievalToPrompt(retrievalResult);

  // ── 阶段3：判断API可用性 ──
  if (!hasAPIKey()) {
    return buildLocalResult(preAnnotation, agentType, startTime, similar.length);
  }

  // ── 阶段4：并行多Agent分析 ──
  try {
    const specialistOutputs = await runParallelAnalysis(title, content, {
      agentTypes: [
        "emotion-analyst",
        "cognitive-detector",
        "pattern-recognizer",
        "narrative-reframer",
        "action-advisor",
      ],
      preAnnotationPrompt: preAnnoPrompt,
      historyPrompt: retrievalPrompt,
      concurrency: {
        maxConcurrency: 3,
        defaultTimeoutMs: 30000,
      },
    });

    const successCount = specialistOutputs.filter(o => o.success).length;

    // 如果所有Agent都失败了，降级
    if (successCount === 0) {
      console.warn("[Pipeline] 所有专业Agent分析失败，降级为本地分析");
      return buildLocalResult(preAnnotation, agentType, startTime, similar.length);
    }

    // 少于2个成功也降级（关键信息不足）
    if (successCount < 2) {
      console.warn(`[Pipeline] 仅${successCount}个Agent成功，降级为本地分析`);
      return buildLocalResult(preAnnotation, agentType, startTime, similar.length);
    }

    // ── 阶段4.5：汇总Agent输出 ──
    const v = preAnnotation.roughVAD.valence;
    const fallbackPrimary = v > 0.15 ? "喜悦" : v < -0.15 ? "悲伤" : "平静";

    const aggregated = aggregateResults({
      specialistOutputs,
      fallbackTopics: preAnnotation.detectedTopics,
      fallbackTags: preAnnotation.detectedTopics.slice(0, 2),
      fallbackVAD: preAnnotation.roughVAD,
      fallbackEmotions: preAnnotation.roughEmotions,
      fallbackStage: preAnnotation.detectedStage,
      fallbackPrimaryEmotion: fallbackPrimary,
      fallbackIntensity: clamp(Math.abs(v) * 0.7 + preAnnotation.roughVAD.arousal * 0.3, 0.1, 1),
      fallbackInsight: "这篇日记记录了你的真实感受。",
      fallbackFeedback: "感谢你的记录。",
      fallbackFollowUp: "这件事让你对自己有了什么新的认识？",
    });

    // ── 阶段5：验证 ──
    const result: Omit<AnalysisOutput, "meta"> = {
      vadScore: aggregated.vadScore,
      emotionLabels: aggregated.emotionLabels,
      primaryEmotion: aggregated.primaryEmotion,
      intensity: aggregated.intensity,
      cognitiveStage: aggregated.cognitiveStage,
      topics: aggregated.topics,
      tags: aggregated.tags,
      insight: aggregated.insight,
      feedback: aggregated.feedback,
      followUpQuestion: aggregated.followUpQuestion,
    };

    sanitizeResult(result);
    const { warnings } = validateAnalysisResult(result);

    if (warnings.length > 0) {
      console.warn(`[Pipeline] 验证告警 (${warnings.length}条):`, warnings.map(w => w.message));
    }

    // ── 阶段5.5：模式匹配（查找类似历史情境+成长里程碑）──
    let similarPattern: Record<string, unknown> | undefined;
    let milestone: Record<string, unknown> | undefined;

    try {
      // 查找类似历史情境
      if (context.diaryId) {
        const { db } = await import("@/lib/db");
        const currentDiary = await db.diaries.get(context.diaryId);
        if (currentDiary) {
          const similar = await findSimilarResolvedSituation(currentDiary);
          if (similar) {
            similarPattern = {
              matchedDiaryId: similar.matchedDiary.id,
              matchedDiaryTitle: similar.matchedDiary.title,
              similarityScore: similar.matchedDiary.score,
              insight: similar.suggestedInsight,
            };
          }
        }
      }

      // 检测成长里程碑（每10次检测一次，减少计算）
      if (Math.random() < 0.1 && !similarPattern) {
        const milestones = await detectGrowthMilestones();
        if (milestones.length > 0) {
          const latest = milestones[milestones.length - 1];
          milestone = {
            topicName: latest.topicName,
            stages: latest.stages,
            totalDays: latest.totalDays,
          };
        }
      }
    } catch {
      // 模式匹配失败不影响主流程
    }

    const meta: NonNullable<AnalysisOutput["meta"]> = {
      agentType,
      preAnnotationCoverage: preAnnotation.coverage,
      retrievedCount: similar.length,
      fallback: false,
      totalDuration: Date.now() - startTime,
    };
    if (similarPattern) (meta as any).similarPattern = similarPattern;
    if (milestone) (meta as any).milestone = milestone;

    return {
      ...result,
      meta,
    };
  } catch (e) {
    console.error("[Pipeline] 并行分析异常，降级为本地分析:", e);
    return buildLocalResult(preAnnotation, agentType, startTime, similar.length);
  }
}

// ── 本地降级分析 ──

function buildLocalResult(
  pre: ReturnType<typeof preAnnotate>,
  agentType: AgentType,
  startTime: number,
  retrievedCount: number
): AnalysisOutput {
  const v = pre.roughVAD.valence;
  const primaryEmotion = v > 0.15 ? "喜悦" : v < -0.15 ? "悲伤" : "平静";

  const emotionLabelMap: Record<string, string> = {
    joy: "喜悦", trust: "信任", fear: "恐惧", surprise: "惊讶",
    sadness: "悲伤", disgust: "厌恶", anger: "愤怒", anticipation: "期待",
  };

  let topEmotion = "joy";
  let topScore = 0;
  for (const [k, score] of Object.entries(pre.roughEmotions)) {
    if (score > topScore) { topScore = score; topEmotion = k; }
  }

  const intensity = clamp(Math.abs(v) * 0.7 + pre.roughVAD.arousal * 0.3, 0.1, 1);

  const insightMap: Record<string, string> = {
    joy: "你在记录中流露出喜悦的情绪。注意这些让你快乐的来源——它们是你内在价值感的重要信号。",
    sadness: "字里行间透出淡淡的忧伤。允许自己悲伤是一种力量，它在告诉你什么对你来说是真正重要的。",
    anger: "愤怒是一种边界感——它在提醒你，某些东西被侵犯了。试着问自己：愤怒的背后，你在保护什么？",
    fear: "焦虑和不安笼罩着你的文字。恐惧常常是成长的前奏——它在告诉你，你正在接近某个重要的边界。",
    trust: "平静接纳的状态是很难得的。这种内在的安定感，是你面对生活风浪的锚点。",
    surprise: "意外带来的震动还在回响。给自己一些时间去消化和整合新的信息。",
    disgust: "有些东西让你感到排斥。排斥感常常指向你深层价值观被触碰的地方。",
    anticipation: "你在期待什么，也在担忧什么。这种期待中带着不确定，正是人生的常态。",
  };

  const feedbackMap: Record<string, string> = {
    joy: "为你的快乐感到高兴。把这些让你喜悦的人和事记在心里，它们是你人生的底色。",
    sadness: "谢谢你的诚实。悲伤不是需要被快速解决的情绪，它是心灵在消化重要的事情。",
    anger: "写下这些愤怒的感受本身就是一种释放。给自己一些空间，等平静下来再回头看。",
    fear: "你的担忧是有道理的。面对不确定，最勇敢的事就是承认'我其实有点怕'。",
    trust: "接纳是一种智慧。你已经比很多人更懂得如何与自己的情绪共处了。",
    surprise: "生活总是充满意外。用好奇心去看看，这背后会不会有一个你没注意到的礼物？",
    disgust: "不喜欢的感受也是重要的导航。它在帮你澄清什么对你来说是不可接受的。",
    anticipation: "期待是生活里的小火花。无论结果如何，这份期待本身已经丰富了你的内心。",
  };

  const followUpMap: Record<string, string> = {
    "觉察": "这个感受在你生活中出现的频率有多高？",
    "接纳": "当你完全接纳这个感受时，身体哪个部位最先放松？",
    "理解": "你觉得这个模式的根源可能是什么？",
    "重构": "如果换一个完全不同的视角看这件事，会看到什么？",
    "行动": "你打算迈出的第一步是什么？",
  };

  return {
    vadScore: pre.roughVAD,
    emotionLabels: pre.roughEmotions,
    primaryEmotion: emotionLabelMap[topEmotion] || primaryEmotion,
    intensity,
    cognitiveStage: pre.detectedStage,
    topics: pre.detectedTopics,
    tags: pre.detectedTopics.slice(0, 2),
    insight: insightMap[topEmotion] || insightMap.trust,
    feedback: feedbackMap[topEmotion] || feedbackMap.trust,
    followUpQuestion: followUpMap[pre.detectedStage] || followUpMap["觉察"],
    meta: {
      agentType,
      preAnnotationCoverage: pre.coverage,
      retrievedCount,
      fallback: true,
      totalDuration: Date.now() - startTime,
    },
  };
}
