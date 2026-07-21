// 中文情绪表达预处理 v1.0
// 中文情绪表达有独特特征：躯体隐喻、间接否定、程度虚词、文化特有用语
// 这些在英文情绪模型中常被忽略，但对中文情绪分析至关重要

export interface CNPreprocessResult {
  /** 躯体隐喻→情绪映射 */
  somaticMetaphors: { phrase: string; emotion: string; weight: number }[];
  /** 检测到的间接否定表达 */
  indirectNegations: string[];
  /** 程度副词调整系数 (0.5=弱化, 1.5=强化) */
  intensityModifier: number;
  /** 文化特有情绪词 */
  culturalEmotions: { word: string; label: string }[];
}

// ── 躯体隐喻 → 情绪映射 ──
// 中文中大量使用身体感受来表达情绪状态
const SOMATIC_METAPHOR_MAP: Record<string, { emotion: string; weight: number; note: string }> = {
  // 心/胸区域 — 常映射到悲伤、焦虑
  "心痛": { emotion: "sadness", weight: 1.2, note: "心理痛苦的躯体化" },
  "心碎": { emotion: "sadness", weight: 1.3, note: "强烈失落感" },
  "心累": { emotion: "sadness", weight: 1.0, note: "情感耗竭" },
  "心慌": { emotion: "fear", weight: 1.0, note: "焦虑的躯体表现" },
  "心跳加速": { emotion: "fear", weight: 0.9, note: "紧张/恐惧" },
  "心里堵": { emotion: "sadness", weight: 1.0, note: "压抑的情绪" },
  "心里难受": { emotion: "sadness", weight: 1.0, note: "无法言说的痛苦" },
  "胸闷": { emotion: "sadness", weight: 0.9, note: "压抑/抑郁" },
  "心不在焉": { emotion: "sadness", weight: 0.5, note: "低落/分心" },
  "安心": { emotion: "trust", weight: 0.8, note: "安全感" },
  "放心": { emotion: "trust", weight: 0.7, note: "释然/信任" },
  "操心": { emotion: "fear", weight: 0.8, note: "担忧" },
  "揪心": { emotion: "sadness", weight: 1.1, note: "极度的担忧和痛苦" },

  // 头部 — 常映射到压力、焦虑
  "头疼": { emotion: "fear", weight: 0.7, note: "压力/烦恼" },
  "头晕": { emotion: "fear", weight: 0.6, note: "迷茫/压力" },
  "头大": { emotion: "fear", weight: 0.7, note: "烦恼/不知所措" },
  "脑壳疼": { emotion: "fear", weight: 0.8, note: "极度烦恼(口语)" },

  // 睡眠 — 常映射到焦虑
  "睡不着": { emotion: "fear", weight: 0.8, note: "焦虑导致的失眠" },
  "失眠": { emotion: "fear", weight: 0.9, note: "焦虑/压力" },
  "熬夜": { emotion: "fear", weight: 0.5, note: "可能指向逃避/焦虑" },
  "醒来": { emotion: "fear", weight: 0.4, note: "可能指半夜醒来(焦虑)" },

  // 消化系统 — 常映射到焦虑
  "胃痛": { emotion: "fear", weight: 0.7, note: "紧张/焦虑的躯体化" },
  "反胃": { emotion: "disgust", weight: 0.8, note: "厌恶的躯体化" },
  "吃不下": { emotion: "sadness", weight: 0.7, note: "抑郁/焦虑" },
  "没胃口": { emotion: "sadness", weight: 0.6, note: "低落" },

  // 全身 — 常映射到抑郁/耗竭
  "浑身无力": { emotion: "sadness", weight: 0.8, note: "抑郁/耗竭" },
  "累得不想动": { emotion: "sadness", weight: 0.9, note: "情感耗竭" },
  "透不过气": { emotion: "fear", weight: 1.0, note: "窒息感/焦虑" },
  "喘不过气": { emotion: "fear", weight: 1.0, note: "压力/焦虑" },

  // 哭泣相关
  "想哭": { emotion: "sadness", weight: 1.0, note: "悲伤" },
  "忍不住哭": { emotion: "sadness", weight: 1.2, note: "强烈悲伤" },
  "红了眼眶": { emotion: "sadness", weight: 0.9, note: "隐忍的悲伤" },
  "泪流满面": { emotion: "sadness", weight: 1.3, note: "极度悲伤" },

  // 发热/上火
  "上火": { emotion: "anger", weight: 0.7, note: "愤怒/烦躁的躯体化" },
  "火大": { emotion: "anger", weight: 1.0, note: "极度愤怒" },
  "冒火": { emotion: "anger", weight: 1.1, note: "愤怒" },
  "烦死了": { emotion: "anger", weight: 1.0, note: "极度烦躁" },
};

// ── 间接否定表达 ──
// 中文中常用表面接受来表达实际上的失望/放弃
const INDIRECT_NEGATION_PATTERNS = [
  "算了", "随便吧", "无所谓", "习惯了", "就这样吧",
  "随便", "没关系(表示放弃时)", "不说了", "没什么",
  "没事", "没关系啦", "都可以", "无所谓了",
  "爱怎样怎样", "不管了", "放弃吧",
];

// ── 程度副词 → 权重调整系数 ──
const INTENSITY_MODIFIERS: Record<string, number> = {
  // 弱化词
  "有点": 0.6, "稍微": 0.5, "略微": 0.5, "一点点": 0.5,
  "有一点点": 0.4, "不太": 0.6, "不怎么": 0.5,
  // 强化词
  "特别": 1.4, "非常": 1.3, "极其": 1.5, "十分": 1.3,
  "格外": 1.3, "异常": 1.4, "无比": 1.5,
  "太": 1.3, "好": 1.2, "真": 1.2, "很": 1.1, "挺": 1.1,
};

// ── 文化特有情绪词（英文情绪模型中没有对应）──
const CULTURAL_EMOTION_MAP: Record<string, { label: string; v: number; a: number; d: number }> = {
  "委屈": { label: "sadness", v: -0.35, a: 0.2, d: -0.25 },
  "憋屈": { label: "anger", v: -0.4, a: 0.4, d: -0.2 },
  "心累": { label: "sadness", v: -0.3, a: -0.05, d: -0.15 },
  "无奈": { label: "sadness", v: -0.25, a: -0.1, d: -0.3 },
  "无语": { label: "anger", v: -0.2, a: 0.1, d: -0.1 },
  "尴尬": { label: "fear", v: -0.15, a: 0.25, d: -0.3 },
  "羡慕": { label: "anticipation", v: 0.1, a: 0.2, d: -0.1 },
  "嫉妒": { label: "anger", v: -0.3, a: 0.35, d: -0.15 },
  "不甘": { label: "anger", v: -0.2, a: 0.3, d: 0.1 },
  "舍不得": { label: "sadness", v: -0.15, a: 0.1, d: -0.1 },
  "心疼": { label: "sadness", v: -0.2, a: 0.1, d: -0.05 },
  "感动": { label: "joy", v: 0.35, a: 0.25, d: 0.1 },
  "欣慰": { label: "joy", v: 0.3, a: 0.1, d: 0.25 },
  "踏实": { label: "trust", v: 0.25, a: -0.15, d: 0.3 },
  "烦躁": { label: "anger", v: -0.3, a: 0.3, d: 0.1 },
  "郁闷": { label: "sadness", v: -0.3, a: -0.05, d: -0.1 },
  "后悔": { label: "sadness", v: -0.35, a: 0.15, d: -0.2 },
  "愧疚": { label: "sadness", v: -0.35, a: 0.2, d: -0.15 },
  "自责": { label: "sadness", v: -0.4, a: 0.2, d: -0.25 },
  "绝望": { label: "sadness", v: -0.5, a: 0.15, d: -0.5 },
};

// ── 检测函数 ──

/** 对文本做中文特有的预处理 */
export function cnPreprocess(text: string): CNPreprocessResult {
  // 1. 检测躯体隐喻
  const somaticMetaphors: CNPreprocessResult["somaticMetaphors"] = [];
  for (const [phrase, info] of Object.entries(SOMATIC_METAPHOR_MAP)) {
    if (text.includes(phrase)) {
      somaticMetaphors.push({ phrase, emotion: info.emotion, weight: info.weight });
    }
  }

  // 2. 检测间接否定
  const indirectNegations = INDIRECT_NEGATION_PATTERNS.filter(p => text.includes(p));

  // 3. 计算程度副词整体修饰系数
  let intensityModifier = 1.0;
  let modifierCount = 0;
  for (const [word, coeff] of Object.entries(INTENSITY_MODIFIERS)) {
    if (text.includes(word)) {
      intensityModifier *= coeff;
      modifierCount++;
    }
  }
  // 多个修饰词取平均效果
  if (modifierCount > 1) {
    intensityModifier = 1.0 + (intensityModifier - 1.0) / modifierCount;
  }
  intensityModifier = Math.max(0.4, Math.min(1.6, intensityModifier));

  // 4. 检测文化特有情绪词
  const culturalEmotions: CNPreprocessResult["culturalEmotions"] = [];
  for (const [word, info] of Object.entries(CULTURAL_EMOTION_MAP)) {
    if (text.includes(word)) {
      culturalEmotions.push({ word, label: info.label });
    }
  }

  return { somaticMetaphors, indirectNegations, intensityModifier, culturalEmotions };
}

/** 将中文预处理结果格式化为提示文本 */
export function cnPreprocessToPrompt(result: CNPreprocessResult): string {
  const parts: string[] = [];

  if (result.somaticMetaphors.length > 0) {
    parts.push("## 中文躯体隐喻检测");
    parts.push("以下身体感受可能在表达情绪状态：");
    result.somaticMetaphors.slice(0, 5).forEach(m => {
      parts.push(`  - "${m.phrase}" → 可能映射到 ${m.emotion} 情绪 (置信权重:${m.weight.toFixed(1)})`);
    });
  }

  if (result.indirectNegations.length > 0) {
    parts.push("\n## 间接表达检测");
    parts.push(`检测到可能的间接否定/放弃信号: ${result.indirectNegations.join("、")}`);
    parts.push("注意：这些表面上的'算了''无所谓'可能隐藏着失望或悲伤。");
  }

  if (result.intensityModifier !== 1.0) {
    const dir = result.intensityModifier > 1 ? "强化" : "弱化";
    parts.push(`\n## 程度副词修正`);
    parts.push(`文本中的程度副词整体呈${dir}趋势 (修正系数:${result.intensityModifier.toFixed(2)})`);
    parts.push("请在判断情绪强度时考虑这个修饰。");
  }

  if (result.culturalEmotions.length > 0) {
    parts.push("\n## 中文特有情绪词");
    parts.push(result.culturalEmotions.map(e => `"${e.word}"(${e.label})`).join("、"));
  }

  return parts.join("\n");
}

/** 获取中文文化情绪词库(可直接合并到预标注词库) */
export function getCNEmotionLexicon(): Record<string, { v: number; a: number; d: number; label: string; weight: number }> {
  const lexicon: Record<string, { v: number; a: number; d: number; label: string; weight: number }> = {};
  for (const [word, info] of Object.entries(CULTURAL_EMOTION_MAP)) {
    lexicon[word] = { v: info.v, a: info.a, d: info.d, label: info.label, weight: 0.9 };
  }
  return lexicon;
}
