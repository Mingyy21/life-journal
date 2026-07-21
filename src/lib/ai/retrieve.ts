// RAG-lite：基于关键词+课题匹配的相似日记检索
// 零外部依赖，使用TF-IDF思想做文本相似度
// 用途：为LLM分析提供"用户历史上下文"
import type { Diary, AnalysisResult } from "@/types";
import type { RetrievedDiary, RetrievalResult } from "./types";
import { db } from "@/lib/db";

/** 中文停用词 */
const STOP_WORDS = new Set(["的","了","在","是","我","有","和","就","不","人","都","一","一个","上","也","很","到","说","要","去","你","会","着","没有","看","好","自己","这"]);

/** 分词（简易版，按常见分隔+停用词过滤） */
function tokenize(text: string): string[] {
  const cleaned = text.replace(/[，。！？、；：""''（）《》【】\s\n\r]+/g, " ").trim();
  return cleaned.split(" ").filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

/** 计算两段文本的Jaccard相似度（基于词袋） */
function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/** 从IndexedDB检索与当前日记最相似的日记 */
export async function retrieveSimilar(
  title: string,
  content: string,
  topicIds: string[],
  limit = 5
): Promise<RetrievedDiary[]> {
  try {
    const currentTokens = tokenize(title + " " + content);
    const allDiaries = await db.diaries.orderBy("createdAt").reverse().toArray();

    const scored: RetrievedDiary[] = [];

    for (const diary of allDiaries) {
      // 跳过无内容或极短日记
      if (diary.content.length < 10) continue;

      // 计算课题重叠分
      const diaryTopics = diary.topicIds || [];
      const topicOverlap = topicIds.length > 0
        ? diaryTopics.filter(t => topicIds.includes(t)).length / Math.max(topicIds.length, 1)
        : 0;

      // 计算关键词Jaccard相似度
      const diaryTokens = tokenize(diary.title + " " + diary.content);
      const keywordScore = jaccardSimilarity(currentTokens, diaryTokens);

      // 综合评分：关键词60% + 课题重叠40%
      const score = keywordScore * 0.6 + topicOverlap * 0.4;

      if (score > 0.05) {
        const matchReason = topicOverlap > 0.3
          ? "topic"
          : keywordScore > topicOverlap ? "keyword" : "topic";

        scored.push({
          id: diary.id,
          title: diary.title,
          content: diary.content.slice(0, 200), // 只取前200字作为上下文
          createdAt: diary.createdAt,
          score: Math.round(score * 100) / 100,
          matchReason,
        });
      }
    }

    // 按评分降序排列
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (e) {
    console.warn("检索相似日记失败:", e);
    return [];
  }
}

/** 获取情绪趋势（基于已有的分析记录） */
export async function getEmotionTrend(
  topicIds: string[],
  limit = 10
): Promise<RetrievalResult["emotionTrend"]> {
  try {
    const analyses = await db.analysisResults.orderBy("createdAt").reverse().toArray();
    if (analyses.length === 0) return undefined;

    const trend = analyses
      .filter(a => {
        const diary = a.diaryId; // 无法直接获取日记的话题，先返回所有
        return true;
      })
      .slice(0, limit)
      .map(a => ({
        date: a.createdAt.toISOString().slice(0, 10),
        valence: a.vadScore.valence,
        primaryEmotion: a.primaryEmotion,
      }))
      .reverse();

    return trend.length > 0 ? trend : undefined;
  } catch {
    return undefined;
  }
}

/** 检索结果格式化为LLM提示文本 */
export function retrievalToPrompt(result: RetrievalResult): string {
  const parts: string[] = [];

  if (result.similar.length > 0) {
    parts.push("## 历史相关日记");
    result.similar.forEach((d, i) => {
      parts.push(`### ${i + 1}. ${d.title} (相关度: ${(d.score * 100).toFixed(0)}%, ${d.createdAt.toISOString().slice(0, 10)})`);
      parts.push(`${d.content.slice(0, 150)}${d.content.length > 150 ? "..." : ""}`);
    });
  }

  if (result.emotionTrend && result.emotionTrend.length > 1) {
    parts.push("\n## 近期情绪趋势");
    result.emotionTrend.forEach(t => {
      const bar = t.valence > 0 ? "+".repeat(Math.round(t.valence * 10)) : "-".repeat(Math.round(Math.abs(t.valence) * 10));
      parts.push(`- ${t.date}: ${bar} (${t.primaryEmotion})`);
    });
  }

  return parts.join("\n");
}
