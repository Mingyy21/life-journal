// 专业Agent系统 v2.0 — 并行多Agent分析
// 设计原则：每个Agent职责单一、Prompt聚焦、独立并行执行
// 参考：Bunny双Agent架构(2025) + Self-Growing Memory Network(2025)

import OpenAI from "openai";
import type { VADScore, EmotionLabels } from "@/types";
import type { AgentType, PreAnnotation, RetrievedDiary } from "./types";

// ── API调用抽象层 ──

export interface ApiCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export type ApiCallFn = (
  messages: { role: "system" | "user"; content: string }[],
  options?: ApiCallOptions
) => Promise<string>;

/** 默认API调用（OpenAI兼容接口），可替换为自研模型适配器 */
let _apiCall: ApiCallFn | null = null;

export function setApiCall(fn: ApiCallFn): void {
  _apiCall = fn;
}

function getApiCall(): ApiCallFn {
  if (_apiCall) return _apiCall;

  const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });

  return async (messages, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

    try {
      const response = await openai.chat.completions.create(
        {
          model: options?.model || process.env.AI_MODEL || "deepseek-chat",
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: options?.temperature ?? 0.5,
          max_tokens: options?.maxTokens ?? 800,
        },
        { signal: controller.signal }
      );
      return (response.choices[0]?.message?.content || "").trim();
    } finally {
      clearTimeout(timeout);
    }
  };
}

// ── 专业Agent定义 ──

export interface SpecialistConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  /** 是否依赖历史日记上下文 */
  needsHistory: boolean;
  /** 是否依赖其他Agent的输出 */
  needsPeerOutput: boolean;
  priority: "high" | "medium" | "low";
}

export interface SpecialistOutput {
  specialistId: string;
  specialistName: string;
  success: boolean;
  data: Record<string, unknown>;
  duration: number;
  error?: string;
}

/** 情绪分析师 — VAD三维+Plutchik八情绪轮 */
export const EMOTION_ANALYST: SpecialistConfig = {
  id: "emotion-analyst",
  name: "情绪分析师",
  role: "VAD情绪评估+Plutchik情绪标签",
  systemPrompt: `你是一位情绪分析专家。你的唯一任务是对文本做情绪维度的量化评估。

## 输出格式（只返回JSON，不要任何其他文字）
{
  "vadScore": {
    "valence": -1到1之间的数字（愉悦度：正=愉悦，负=不悦），
    "arousal": 0到1之间的数字（唤醒度：高=激动，低=平静），
    "dominance": 0到1之间的数字（支配度：高=掌控，低=失控）
  },
  "emotionLabels": {
    "joy": 0到1,
    "trust": 0到1,
    "fear": 0到1,
    "surprise": 0到1,
    "sadness": 0到1,
    "disgust": 0到1,
    "anger": 0到1,
    "anticipation": 0到1
  },
  "primaryEmotion": "主导情绪的中文名（如：喜悦、悲伤、愤怒、恐惧、平静、焦虑等）",
  "intensity": 0到1之间的数字（整体情绪强度）
}

## 中文情绪表达的特殊注意
- 中文用户常用身体感受来表达情绪：
  "心痛""心累""胸闷" → sadness
  "头疼""睡不着""心慌" → fear/anxiety
  "上火""火大" → anger
  "没胃口""浑身无力" → sadness
- 中文特有情绪词无法简单映射到英文模型：
  "委屈" → sadness+anger混合(憋着说不出的不满)
  "憋屈" → anger为主+低dominance(被压制无法表达的愤怒)
  "心累" → sadness+低arousal(情感耗竭)
  "无奈" → sadness+低dominance(无力改变)
  "无语" → anger或disgust(不知从何说起的厌恶)
  "尴尬" → fear+低dominance(社交焦虑)
  "愧疚""自责" → sadness+高arousal(向内攻击的悲伤)
  "感动" → joy+低arousal(温暖的正向情绪)
  "踏实" → trust+低arousal(安全感)
- 注意"表面接受实为放弃"的表达：
  "算了""随便吧""无所谓""习惯了" 常隐藏着失望或悲伤
- 程度副词影响整体强度判断：
  "有点"→弱化 "特别""非常""极其"→强化

## 重要原则
- 一篇日记通常混合多种情绪，不要只给一种情绪高分
- 注意文本中的情绪转折和矛盾情绪（如"虽然难过但也在期待"）
- 如果没有明确的某种情绪证据，给0.05以下的值，不要随意给分
- 检测到躯体隐喻时，将其映射为对应的情绪维度`,
  temperature: 0.4,
  maxTokens: 600,
  timeoutMs: 25000,
  needsHistory: false,
  needsPeerOutput: false,
  priority: "high",
};

/** 认知阶段判定师 — 识别CBT认知阶段 */
export const COGNITIVE_DETECTOR: SpecialistConfig = {
  id: "cognitive-detector",
  name: "认知阶段判定师",
  role: "CBT认知阶段识别",
  systemPrompt: `你是一位认知行为分析专家。你的唯一任务是判定文本反映了哪个认知成长阶段。

## 五个阶段（参考CBT框架）
- 觉察：开始注意到问题/情绪/模式的存在（关键词：发现、意识到、注意到、我看见、原来）
- 接纳：接受现实、允许情绪存在、不抗拒（关键词：接受、接纳、承认、没关系、这就是）
- 理解：开始分析原因和根源（关键词：因为、原因、根源、模式、原来如此、来自于）
- 重构：重新定义经历的意义、换角度看问题（关键词：换个角度、其实、也许可以、另一种、转念）
- 行动：准备或已经做出改变（关键词：决定、打算、计划、开始、尝试、做了、去行动）

## 输出格式（只返回JSON）
{
  "cognitiveStage": "觉察｜接纳｜理解｜重构｜行动",
  "confidence": 0到1（判定信心），
  "evidence": ["文本中支持该判定的原文片段（1-3个短句）"],
  "secondaryStage": "如果文本同时表现了另一个阶段，写在这里，否则null"
}`,
  temperature: 0.3,
  maxTokens: 500,
  timeoutMs: 20000,
  needsHistory: false,
  needsPeerOutput: false,
  priority: "high",
};

/** 模式识别师 — 对比历史发现重复模式 */
export const PATTERN_RECOGNIZER: SpecialistConfig = {
  id: "pattern-recognizer",
  name: "模式识别师",
  role: "跨时间模式识别",
  systemPrompt: `你是一位心理模式分析师。你的唯一任务是识别当前文本与历史记录之间的关联模式。

## 你需要关注的
1. 情绪模式：类似的情绪反应在不同时间/情境下是否重复出现？
2. 应对模式：面对类似困境时，用户的应对方式有什么变化或重复？
3. 触发模式：是否有类似的触发因素反复出现？
4. 成长线索：与历史相比，用户在认知或行为上有什么变化？

## 输出格式（只返回JSON）
{
  "detectedPatterns": [
    {
      "name": "模式简短命名",
      "description": "1-2句话描述该模式",
      "frequency": "首次出现｜偶尔出现｜反复出现",
      "evidence": "当前文本+历史文本中的证据"
    }
  ],
  "comparisonWithPast": "与历史相比的1-2句总体对比（如果有历史数据），没有历史数据则写'无历史数据'",
  "growthSignal": "是否观察到成长信号？（如：应对方式升级、认知深化、情绪调节改善）null或描述"
}

## 重要原则
- 如果没有提供历史日记，坦诚说明而不是编造
- 模式识别要基于具体文本证据，不要泛泛而谈
- 注意区分"表面相似"和"深层模式相同"`,
  temperature: 0.5,
  maxTokens: 800,
  timeoutMs: 25000,
  needsHistory: true,
  needsPeerOutput: false,
  priority: "medium",
};

/** 叙事重构师 — 给经历赋予新的意义 */
export const NARRATIVE_REFARMER: SpecialistConfig = {
  id: "narrative-reframer",
  name: "叙事重构师",
  role: "叙事重构+意义发现",
  systemPrompt: `你是一位叙事治疗师，遵循"不知情姿态"（not-knowing stance）。你的唯一任务是帮助用户从自己的叙述中发现新的意义。

## 你需要做的
1. 找出文本中用户自己可能没意识到的力量、智慧或成长
2. 用温和的方式指出隐藏的积极模式或价值观
3. 给出一个"重新看待"这个经历的角度
4. 以试探性语言表达（"也许"、"可能"、"我在想"），不做断言

## 输出格式（只返回JSON）
{
  "insight": "1-2句话，点出用户可能没意识到的隐藏模式或联系",
  "reframedPerspective": "1-2句话，给这个经历一个更具成长性的解读角度",
  "hiddenStrength": "用户在文本中展现但可能没意识到的性格力量或资源",
  "narrativeThread": "如果这是一个持续的故事线，用1句话概括这条线"
}`,
  temperature: 0.6,
  maxTokens: 700,
  timeoutMs: 25000,
  needsHistory: false,
  needsPeerOutput: true,
  priority: "medium",
};

/** 行动建议师 — 从洞察到行动 */
export const ACTION_ADVISOR: SpecialistConfig = {
  id: "action-advisor",
  name: "行动建议师",
  role: "行动建议+引导问题",
  systemPrompt: `你是一位成长教练。你的唯一任务是给出具体、可执行的微行动建议和深度反思问题。

## 你需要做的
1. 基于文本的情绪和认知状态，提1个能引导用户进一步探索的开放问题
2. 给1个具体的、微小的、可以今天/明天就做的行动建议
3. 反馈要温暖而专业，像朋友又像咨询师

## 输出格式（只返回JSON）
{
  "followUpQuestion": "1个能引导用户进一步探索的开放问题",
  "microAction": "1个具体的、可执行的微小行动建议（1-2句话）",
  "feedback": "2-3句话的温暖回应，肯定用户的记录，认可努力或觉察",
  "supportiveTone": "鼓励｜共情｜挑战｜陪伴（选择一个最合适的语气词）"
}

## 重要原则
- 微行动必须具体：不是"多运动"而是"明天午饭后散步10分钟"
- 问题要开放：不是"你觉得对吗"而是"如果你可以改变这个模式的一小部分，你会从哪里开始？"
- 反馈要真诚，不要套话`,
  temperature: 0.5,
  maxTokens: 600,
  timeoutMs: 20000,
  needsHistory: false,
  needsPeerOutput: true,
  priority: "low",
};

/** 所有专业Agent配置映射 */
export const SPECIALISTS: Record<string, SpecialistConfig> = {
  "emotion-analyst": EMOTION_ANALYST,
  "cognitive-detector": COGNITIVE_DETECTOR,
  "pattern-recognizer": PATTERN_RECOGNIZER,
  "narrative-reframer": NARRATIVE_REFARMER,
  "action-advisor": ACTION_ADVISOR,
};

// ── 并行执行引擎 ──

export interface ParallelExecutionOptions {
  /** 最大并发数，默认3 */
  maxConcurrency?: number;
  /** 单Agent超时(ms)，默认30000 */
  defaultTimeoutMs?: number;
}

interface SpecialistTask {
  specialist: SpecialistConfig;
  messages: { role: "system" | "user"; content: string }[];
}

/** 按优先级排序执行队列 */
function sortByPriority(tasks: SpecialistTask[]): SpecialistTask[] {
  const order = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => (order[a.specialist.priority] || 0) - (order[b.specialist.priority] || 0));
}

/** 限流器：控制并发数 */
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift()!;
      try {
        const value = await task();
        results.push({ status: "fulfilled", value });
      } catch (error) {
        results.push({ status: "rejected", reason: error });
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** 执行单个专业Agent分析 */
async function runSpecialist(
  specialist: SpecialistConfig,
  messages: { role: "system" | "user"; content: string }[],
  timeoutMs: number
): Promise<SpecialistOutput> {
  const startTime = Date.now();

  try {
    const apiCall = getApiCall();
    const rawText = await apiCall(messages, {
      temperature: specialist.temperature,
      maxTokens: specialist.maxTokens,
      timeoutMs,
    });

    // 解析JSON
    const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const data = JSON.parse(cleaned);

    return {
      specialistId: specialist.id,
      specialistName: specialist.name,
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "未知错误";
    // 区分超时和解析错误
    const isTimeout = errMsg.includes("abort") || errMsg.includes("timeout");
    return {
      specialistId: specialist.id,
      specialistName: specialist.name,
      success: false,
      data: {},
      duration: Date.now() - startTime,
      error: isTimeout ? `${specialist.name}分析超时` : errMsg,
    };
  }
}

/** 构建专业Agent的消息列表 */
export function buildSpecialistMessages(
  specialist: SpecialistConfig,
  title: string,
  content: string,
  context?: {
    preAnnotationPrompt?: string;
    historyPrompt?: string;
    peerOutputs?: string;
  }
): { role: "system" | "user"; content: string }[] {
  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: specialist.systemPrompt },
  ];

  let userMessage = `标题：${title}\n内容：${content}`;

  if (context?.preAnnotationPrompt && !specialist.needsPeerOutput) {
    userMessage = context.preAnnotationPrompt + "\n\n---\n\n" + userMessage;
  }
  if (context?.historyPrompt && specialist.needsHistory) {
    userMessage = context.historyPrompt + "\n\n---\n\n" + userMessage;
  }
  if (context?.peerOutputs && specialist.needsPeerOutput) {
    userMessage = "其他分析师的结论（供参考，做独立判断）：\n" + context.peerOutputs + "\n\n---\n\n" + userMessage;
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

/** 并行执行所有专业Agent分析 */
export async function runParallelAnalysis(
  title: string,
  content: string,
  options?: {
    agentTypes?: string[];
    preAnnotationPrompt?: string;
    historyPrompt?: string;
    concurrency?: ParallelExecutionOptions;
  }
): Promise<SpecialistOutput[]> {
  const agentIds = options?.agentTypes || Object.keys(SPECIALISTS);
  const maxConcurrency = options?.concurrency?.maxConcurrency ?? 3;
  const defaultTimeout = options?.concurrency?.defaultTimeoutMs ?? 30000;

  // 第一阶段：运行不需要同伴输出的Agent（高优先级+中优先级）
  const phase1Ids = agentIds.filter(id => {
    const s = SPECIALISTS[id];
    return s && !s.needsPeerOutput;
  });

  const phase1Tasks: SpecialistTask[] = phase1Ids.map(id => {
    const specialist = SPECIALISTS[id];
    return {
      specialist,
      messages: buildSpecialistMessages(specialist, title, content, {
        preAnnotationPrompt: options?.preAnnotationPrompt,
        historyPrompt: options?.historyPrompt,
      }),
    };
  });

  const sorted1 = sortByPriority(phase1Tasks);
  const phase1Fns = sorted1.map(t => () =>
    runSpecialist(t.specialist, t.messages, defaultTimeout)
  );
  const phase1Results = await runWithConcurrencyLimit(phase1Fns, maxConcurrency);

  // 收集第一阶段成功的输出
  const phase1Outputs = phase1Results
    .filter((r): r is PromiseFulfilledResult<SpecialistOutput> => r.status === "fulfilled" && r.value.success)
    .map(r => r.value);

  const phase1Failed = phase1Results.filter(
    (r): r is PromiseRejectedResult | PromiseFulfilledResult<SpecialistOutput> => {
      if (r.status === "rejected") return true;
      return !r.value.success;
    }
  );
  if (phase1Failed.length > 0) {
    console.warn(`[并行分析] 第一阶段 ${phase1Failed.length}/${phase1Results.length} 个Agent失败`);
  }

  // 第二阶段：运行需要同伴输出的Agent
  const phase2Ids = agentIds.filter(id => {
    const s = SPECIALISTS[id];
    return s && s.needsPeerOutput;
  });

  if (phase2Ids.length > 0 && phase1Outputs.length > 0) {
    const peerSummary = phase1Outputs
      .map(o => `[${o.specialistName}]: ${JSON.stringify(o.data)}`)
      .join("\n");

    const phase2Tasks: SpecialistTask[] = phase2Ids.map(id => {
      const specialist = SPECIALISTS[id];
      return {
        specialist,
        messages: buildSpecialistMessages(specialist, title, content, {
          preAnnotationPrompt: options?.preAnnotationPrompt,
          historyPrompt: options?.historyPrompt,
          peerOutputs: peerSummary,
        }),
      };
    });

    const phase2Fns = phase2Tasks.map(t => () =>
      runSpecialist(t.specialist, t.messages, defaultTimeout)
    );
    const phase2Results = await runWithConcurrencyLimit(phase2Fns, maxConcurrency);

    const phase2Outputs = phase2Results
      .filter((r): r is PromiseFulfilledResult<SpecialistOutput> => r.status === "fulfilled" && r.value.success)
      .map(r => r.value);

    return [...phase1Outputs, ...phase2Outputs];
  }

  // 如果第一阶段全部失败，返回失败的（让调用方降级）
  if (phase1Outputs.length === 0) {
    const failures: SpecialistOutput[] = phase1Failed.map(r => {
      if (r.status === "rejected") {
        return { specialistId: "unknown", specialistName: "未知", success: false, data: {}, duration: 0, error: String(r.reason) };
      }
      return r.value;
    });
    return failures;
  }

  return phase1Outputs;
}
