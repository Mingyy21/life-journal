// 纵向趋势分析Pipeline v1.0
// 按时间窗口聚合日记→调用时间尺度Agent→结构化输出
// 复用了 agents.ts 中已有的 daily/weekly/monthly/yearly Agent配置

import OpenAI from "openai";
import { getAgent } from "./agents";
import { getMockAnalysis } from "./analysis-local";
import { preAnnotate, preAnnotationToPrompt } from "./preannotate";
import { cnPreprocess, cnPreprocessToPrompt } from "./cn-preprocess";
import type { AgentType } from "./types";
import type { Diary, AnalysisResult, Event, Insight, VADScore, EmotionLabels } from "@/types";

// ── API调用 ──

function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

function hasAPIKey(): boolean {
  return !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "sk-your-api-key-here");
}

// ── 时间窗口工具 ──

export function getWeekRange(targetDate: Date = new Date()): { start: Date; end: Date } {
  const day = targetDate.getDay();
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function getMonthRange(targetDate: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getYearRange(targetDate: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(targetDate.getFullYear(), 0, 1);
  const end = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function filterByRange<T extends { createdAt: Date }>(items: T[], start: Date, end: Date): T[] {
  return items.filter(i => {
    const t = i.createdAt.getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

// ── 聚合函数 ──

interface TrendInput {
  diaries: Diary[];
  analyses: Map<string, AnalysisResult>;
  events: Event[];
  insights: Insight[];
  topics: { id: string; name: string; color: string }[];
}

function buildDailyContext(input: TrendInput): string {
  const { diaries, analyses } = input;
  const today = getTodayRange();
  const todayDiaries = filterByRange(diaries, today.start, today.end);

  if (todayDiaries.length === 0) return "";

  const parts: string[] = [`今日共写了 ${todayDiaries.length} 篇日记：`];
  todayDiaries.forEach((d, i) => {
    const analysis = analyses.get(d.id);
    const pre = preAnnotate(d.title, d.content);
    parts.push(`\n### 日记${i + 1}: ${d.title}`);
    parts.push(d.content.slice(0, 300));
    if (analysis) {
      parts.push(`[已有分析] 情绪:${analysis.primaryEmotion}, 阶段:${analysis.cognitiveStage}, VAD:(${analysis.vadScore.valence.toFixed(2)})`);
    } else {
      parts.push(`[预标注] 情绪倾向:${pre.roughVAD.valence > 0.1 ? "正向" : pre.roughVAD.valence < -0.1 ? "负向" : "中性"}, 阶段:${pre.detectedStage}`);
    }
  });

  return parts.join("\n");
}

function buildWeeklyContext(input: TrendInput): string {
  const { diaries, analyses, events, topics } = input;
  const week = getWeekRange();
  const weekDiaries = filterByRange(diaries, week.start, week.end);
  const weekEvents = filterByRange(events, week.start, week.end);

  if (weekDiaries.length === 0) return "";

  const parts: string[] = [
    `本周(${week.start.toISOString().slice(0, 10)} ~ ${week.end.toISOString().slice(0, 10)}) 共 ${weekDiaries.length} 篇日记。`,
  ];

  // 情绪摘要
  const vals: number[] = [];
  weekDiaries.forEach(d => {
    const a = analyses.get(d.id);
    if (a) vals.push(a.vadScore.valence);
  });
  if (vals.length > 0) {
    const avgV = vals.reduce((s, v) => s + v, 0) / vals.length;
    parts.push(`\n本周平均情绪愉悦度: ${avgV.toFixed(2)} (${vals.length}篇有分析记录)`);
  }

  // 每日摘要
  const byDay = new Map<string, string[]>();
  weekDiaries.forEach(d => {
    const day = d.createdAt.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(d.title);
  });

  parts.push("\n每日记录：");
  for (const [day, titles] of [...byDay].sort()) {
    const weekday = ["日","一","二","三","四","五","六"][new Date(day).getDay()];
    parts.push(`- 周${weekday}: ${titles.join("、")}`);
  }

  // 事件进展
  if (weekEvents.length > 0) {
    parts.push(`\n本周事件进展 (${weekEvents.length}个)：`);
    weekEvents.forEach(e => {
      const topic = topics.find(t => t.id === e.topicId);
      parts.push(`- [${topic?.name || "未知"}][${e.resolutionStatus}] ${e.title}`);
    });
  }

  return parts.join("\n");
}

function buildMonthlyContext(input: TrendInput): string {
  const { diaries, analyses, events, insights } = input;
  const month = getMonthRange();
  const monthDiaries = filterByRange(diaries, month.start, month.end);
  const monthEvents = filterByRange(events, month.start, month.end);
  const monthInsights = filterByRange(insights, month.start, month.end);

  const parts: string[] = [
    `${month.start.getFullYear()}年${month.start.getMonth() + 1}月总结：`,
    `日记 ${monthDiaries.length} 篇，事件 ${monthEvents.length} 个，感悟 ${monthInsights.length} 条。`,
  ];

  // 情绪趋势（取分析过的日记）
  const withAnalysis = monthDiaries.filter(d => analyses.has(d.id));
  if (withAnalysis.length > 0) {
    parts.push("\n情绪变化（取有分析记录的日记）：");
    withAnalysis.forEach(d => {
      const a = analyses.get(d.id)!;
      parts.push(`- ${d.createdAt.toISOString().slice(0, 10)} "${d.title}": ${a.primaryEmotion} (valence:${a.vadScore.valence.toFixed(2)})`);
    });
  }

  // 事件解决进展
  const eventStatusChange = monthEvents.filter(e => e.resolutionStatus === "resolved" || e.resolutionStatus === "accepted");
  if (eventStatusChange.length > 0) {
    parts.push(`\n本月解决/接纳的事件: ${eventStatusChange.map(e => e.title).join("、")}`);
  }

  // 感悟
  if (monthInsights.length > 0) {
    parts.push(`\n本月感悟:`);
    monthInsights.forEach(i => parts.push(`- ${i.title}: ${i.content.slice(0, 100)}`));
  }

  return parts.join("\n");
}

function buildYearlyContext(input: TrendInput): string {
  const { diaries, events, insights } = input;
  const year = getYearRange();
  const yearDiaries = filterByRange(diaries, year.start, year.end);
  const yearEvents = filterByRange(events, year.start, year.end);

  // 年度摘要（不全量发送，只做统计性摘要）
  const parts: string[] = [
    `${year.start.getFullYear()}年度回顾摘要：`,
    `全年共 ${yearDiaries.length} 篇日记，${yearEvents.length} 个事件，${insights.length} 条感悟。`,
  ];

  // 写作频率（按月）
  const byMonth = new Map<number, number>();
  yearDiaries.forEach(d => { const m = d.createdAt.getMonth(); byMonth.set(m, (byMonth.get(m) || 0) + 1); });
  parts.push("\n月度写作量：");
  for (const [m, count] of [...byMonth].sort((a, b) => a[0] - b[0])) {
    parts.push(`- ${m + 1}月: ${count}篇`);
  }

  // 事件解决统计
  const resolved = yearEvents.filter(e => e.resolutionStatus === "resolved" || e.resolutionStatus === "accepted").length;
  parts.push(`\n事件解决率: ${yearEvents.length > 0 ? Math.round(resolved / yearEvents.length * 100) : 0}% (${resolved}/${yearEvents.length})`);

  // 关键词云摘要（标题）
  const titles = yearDiaries.map(d => d.title).join(" ");
  parts.push(`\n年度高频主题词（从标题提取）: ${titles.slice(0, 500)}`);

  return parts.join("\n");
}

// ── 趋势分析主函数 ──

export type TrendScope = "daily" | "weekly" | "monthly" | "yearly";

export interface TrendReport {
  scope: TrendScope;
  generatedAt: Date;
  contextText: string;
  /** LLM返回的结构化报告 */
  report: Record<string, unknown>;
  /** 元信息 */
  diaryCount: number;
  eventCount: number;
  usedLLM: boolean;
}

/** 执行纵向趋势分析 */
export async function runTrendAnalysis(
  scope: TrendScope,
  input: TrendInput
): Promise<TrendReport> {
  const agentType: AgentType = scope === "daily" ? "daily" : scope === "weekly" ? "weekly" : scope === "yearly" ? "yearly" : "monthly";

  // 构建时间窗口上下文
  let contextText = "";
  switch (scope) {
    case "daily": contextText = buildDailyContext(input); break;
    case "weekly": contextText = buildWeeklyContext(input); break;
    case "monthly": contextText = buildMonthlyContext(input); break;
    case "yearly": contextText = buildYearlyContext(input); break;
  }

  if (!contextText) {
    return {
      scope,
      generatedAt: new Date(),
      contextText: "",
      report: { message: `当前时间窗口内没有日记数据` },
      diaryCount: 0,
      eventCount: 0,
      usedLLM: false,
    };
  }

  const diaryCount = scope === "daily"
    ? filterByRange(input.diaries, getTodayRange().start, getTodayRange().end).length
    : scope === "weekly"
    ? filterByRange(input.diaries, getWeekRange().start, getWeekRange().end).length
    : scope === "monthly"
    ? filterByRange(input.diaries, getMonthRange().start, getMonthRange().end).length
    : filterByRange(input.diaries, getYearRange().start, getYearRange().end).length;

  // 预标注
  const pre = preAnnotate(contextText.slice(0, 500), contextText);
  const cn = cnPreprocess(contextText);
  const prePrompt = preAnnotationToPrompt(pre) + "\n" + cnPreprocessToPrompt(cn);

  if (!hasAPIKey()) {
    return {
      scope,
      generatedAt: new Date(),
      contextText,
      report: { message: "未配置API Key，无法生成趋势分析。请配置DEEPSEEK_API_KEY。" },
      diaryCount,
      eventCount: 0,
      usedLLM: false,
    };
  }

  try {
    const agent = getAgent(agentType);
    const response = await getOpenAI().chat.completions.create({
      model: process.env.AI_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: prePrompt + "\n\n---\n\n## 时间窗口数据\n" + contextText },
      ],
      temperature: agent.temperature,
      max_tokens: agent.maxTokens,
    });

    const rawText = (response.choices[0]?.message?.content || "")
      .replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const report = JSON.parse(rawText);

    return {
      scope,
      generatedAt: new Date(),
      contextText,
      report,
      diaryCount,
      eventCount: 0,
      usedLLM: true,
    };
  } catch (e) {
    console.error(`[趋势分析] ${scope} 分析失败:`, e);
    return {
      scope,
      generatedAt: new Date(),
      contextText,
      report: { error: "分析失败，请稍后重试", message: contextText.slice(0, 200) },
      diaryCount,
      eventCount: 0,
      usedLLM: false,
    };
  }
}
