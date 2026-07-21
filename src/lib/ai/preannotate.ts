// 本地预标注 v1.1：基于情绪词库+认知阶段关键词+中文躯体隐喻的规则引擎
// 不依赖API，作为LLM分析的辅助输入和降级方案
import type { PreAnnotation, VADScore, EmotionLabels } from "./types";
import { getCNEmotionLexicon } from "./cn-preprocess";

// ── 情绪词库（VAD偏移 + Plutchik标签 + 权重）──
const EMOTION_LEXICON: Record<string, { v: number; a: number; d: number; label: string; weight: number }> = {
  // 喜悦类
  "开心":{v:0.4,a:0.25,d:0.3,label:"joy",weight:1},"高兴":{v:0.4,a:0.2,d:0.25,label:"joy",weight:1},
  "快乐":{v:0.4,a:0.25,d:0.25,label:"joy",weight:1},"喜悦":{v:0.45,a:0.3,d:0.3,label:"joy",weight:1},
  "兴奋":{v:0.4,a:0.4,d:0.3,label:"joy",weight:1},"激动":{v:0.35,a:0.4,d:0.2,label:"joy",weight:1},
  "满足":{v:0.3,a:0,d:0.2,label:"joy",weight:0.8},"幸福":{v:0.45,a:0.15,d:0.3,label:"joy",weight:1.2},
  "感恩":{v:0.35,a:0.1,d:0.2,label:"trust",weight:0.8},"感谢":{v:0.3,a:0.1,d:0.15,label:"trust",weight:0.7},
  "成就":{v:0.35,a:0.2,d:0.4,label:"joy",weight:0.8},"自豪":{v:0.35,a:0.2,d:0.35,label:"joy",weight:0.9},
  "突破":{v:0.3,a:0.3,d:0.35,label:"joy",weight:0.8},"进步":{v:0.3,a:0.2,d:0.3,label:"anticipation",weight:0.7},
  "成功":{v:0.4,a:0.25,d:0.4,label:"joy",weight:0.9},"放松":{v:0.2,a:-0.2,d:0.1,label:"joy",weight:0.6},
  // 平静类
  "平静":{v:0.1,a:-0.25,d:0.15,label:"joy",weight:0.5},"安静":{v:0.05,a:-0.3,d:0.1,label:"joy",weight:0.4},
  "淡定":{v:0.1,a:-0.25,d:0.2,label:"joy",weight:0.5},"放下":{v:0.15,a:-0.15,d:0.2,label:"trust",weight:0.6},
  "接受":{v:0.1,a:-0.1,d:0.15,label:"trust",weight:0.6},"释然":{v:0.2,a:-0.1,d:0.2,label:"trust",weight:0.7},
  "和解":{v:0.25,a:-0.05,d:0.2,label:"trust",weight:0.8},"顺其自然":{v:0.1,a:-0.2,d:0.1,label:"trust",weight:0.5},
  // 悲伤类
  "难过":{v:-0.35,a:-0.15,d:-0.2,label:"sadness",weight:1},"伤心":{v:-0.4,a:-0.1,d:-0.25,label:"sadness",weight:1.1},
  "悲伤":{v:-0.4,a:-0.1,d:-0.2,label:"sadness",weight:1},"痛苦":{v:-0.45,a:0.2,d:-0.3,label:"sadness",weight:1.2},
  "哭":{v:-0.4,a:0.3,d:-0.3,label:"sadness",weight:1},"流泪":{v:-0.35,a:0.2,d:-0.25,label:"sadness",weight:0.9},
  "失望":{v:-0.3,a:-0.1,d:-0.15,label:"sadness",weight:0.9},"失落":{v:-0.3,a:-0.15,d:-0.2,label:"sadness",weight:0.8},
  "遗憾":{v:-0.2,a:-0.1,d:-0.1,label:"sadness",weight:0.7},"孤独":{v:-0.3,a:-0.1,d:-0.2,label:"sadness",weight:0.9},
  "寂寞":{v:-0.3,a:-0.1,d:-0.15,label:"sadness",weight:0.8},
  // 愤怒类
  "生气":{v:-0.4,a:0.35,d:0.3,label:"anger",weight:1},"愤怒":{v:-0.45,a:0.4,d:0.35,label:"anger",weight:1.2},
  "恼火":{v:-0.35,a:0.3,d:0.25,label:"anger",weight:0.9},"烦躁":{v:-0.3,a:0.3,d:0.1,label:"anger",weight:0.8},
  "讨厌":{v:-0.3,a:0.2,d:0.2,label:"disgust",weight:0.8},"不满":{v:-0.25,a:0.2,d:0.15,label:"anger",weight:0.7},
  "吵架":{v:-0.4,a:0.4,d:0.3,label:"anger",weight:1},"争吵":{v:-0.4,a:0.35,d:0.25,label:"anger",weight:0.9},
  // 恐惧/焦虑类
  "焦虑":{v:-0.35,a:0.35,d:-0.25,label:"fear",weight:1.2},"担心":{v:-0.25,a:0.2,d:-0.15,label:"fear",weight:0.9},
  "害怕":{v:-0.4,a:0.4,d:-0.35,label:"fear",weight:1.1},"恐惧":{v:-0.45,a:0.45,d:-0.4,label:"fear",weight:1.2},
  "不安":{v:-0.3,a:0.25,d:-0.2,label:"fear",weight:0.9},"紧张":{v:-0.2,a:0.3,d:-0.15,label:"fear",weight:0.8},
  "压力":{v:-0.3,a:0.3,d:-0.2,label:"fear",weight:1},"迷茫":{v:-0.2,a:0.1,d:-0.2,label:"fear",weight:0.8},
  "困惑":{v:-0.1,a:0.15,d:-0.1,label:"surprise",weight:0.7},"不知所措":{v:-0.2,a:0.2,d:-0.25,label:"fear",weight:0.8},
  // 惊讶类
  "惊讶":{v:0.1,a:0.35,d:0,label:"surprise",weight:0.7},"意外":{v:0,a:0.3,d:-0.05,label:"surprise",weight:0.6},
  "惊喜":{v:0.4,a:0.35,d:0.2,label:"joy",weight:1},"震惊":{v:-0.2,a:0.4,d:-0.15,label:"surprise",weight:0.9},
  // 中文文化特有情绪词（v1.1 新增，来自cn-preprocess）
  ...getCNEmotionLexicon(),
};

// ── 认知阶段关键词 ──
export const COGNITIVE_STAGE_WORDS: Record<string, string[]> = {
  "觉察": ["发现","意识到","注意到","我看见","我感觉到","原来","突然发现","开始思考"],
  "接纳": ["接受","允许","接纳","承认","没关系","这就是","拥抱","面对"],
  "理解": ["因为","原因","根源","模式","原来如此","理解了","明白了","认识到","来自于"],
  "重构": ["换个角度","重新看待","其实","也许可以","另一种","新的方式","改变想法","转念"],
  "行动": ["决定","打算","计划","从今天起","明天开始","尝试","做了","去行动","迈出"],
};

// ── 课题关键词 ──
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "情绪": ["情绪","感受","心情","难受","感觉","心里"],
  "认知": ["思维","想法","信念","想法","认知","思考","看待","观念","角度"],
  "健身": ["运动","跑步","健身","锻炼","身体","健康","饮食","睡眠","体重"],
  "友情": ["朋友","友谊","闺蜜","兄弟","社交","聚会"],
  "亲情": ["父母","爸爸","妈妈","家人","家里","儿子","女儿","亲戚"],
  "爱情": ["恋爱","男朋友","女朋友","对象","约会","分手","表白","感情"],
  "工作": ["工作","老板","同事","领导","加班","项目","职业","辞职","面试"],
  "学习": ["学习","考试","读书","看书","课程","技能","知识","成绩","学校"],
};

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

/** 对文本做预标注，返回词库匹配结果 */
export function preAnnotate(title: string, content: string): PreAnnotation {
  const text = title + content;
  const matchedWords: PreAnnotation["matchedWords"] = [];
  let v = 0, a = 0, d = 0, totalWeight = 0;
  const emotionScores: Record<string, number> = { joy:0, trust:0, fear:0, surprise:0, sadness:0, disgust:0, anger:0, anticipation:0 };

  for (const [word, info] of Object.entries(EMOTION_LEXICON)) {
    if (text.includes(word)) {
      matchedWords.push({ word, label: info.label, weight: info.weight });
      v += info.v * info.weight;
      a += info.a * info.weight;
      d += info.d * info.weight;
      emotionScores[info.label] += 0.12 * info.weight;
      totalWeight += info.weight;
    }
  }

  const roughVAD: VADScore = {
    valence: totalWeight > 0 ? clamp(v / totalWeight, -1, 1) : 0,
    arousal: totalWeight > 0 ? clamp(0.3 + a / totalWeight, 0, 1) : 0.3,
    dominance: totalWeight > 0 ? clamp(0.5 + d / totalWeight, 0, 1) : 0.5,
  };

  const roughEmotions: EmotionLabels = {
    joy: clamp(emotionScores.joy || 0, 0, 1),
    trust: clamp(emotionScores.trust || 0, 0, 1),
    fear: clamp(emotionScores.fear || 0, 0, 1),
    surprise: clamp(emotionScores.surprise || 0, 0, 1),
    sadness: clamp(emotionScores.sadness || 0, 0, 1),
    disgust: clamp(emotionScores.disgust || 0, 0, 1),
    anger: clamp(emotionScores.anger || 0, 0, 1),
    anticipation: clamp(emotionScores.anticipation || 0, 0, 1),
  };

  // 检测认知阶段
  let detectedStage = "觉察";
  let maxStageScore = 0;
  for (const [stage, words] of Object.entries(COGNITIVE_STAGE_WORDS)) {
    const score = words.filter(w => text.includes(w)).length;
    if (score > maxStageScore) { maxStageScore = score; detectedStage = stage; }
  }

  // 检测课题
  const topicScores: Record<string, number> = {};
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    const score = words.filter(w => text.includes(w)).length;
    if (score > 0) topicScores[topic] = score;
  }
  const detectedTopics = Object.entries(topicScores).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t);
  if (detectedTopics.length === 0) detectedTopics.push("情绪");

  // 覆盖率：匹配到的字符数 / 总字符数（近似）
  const matchedChars = matchedWords.reduce((sum, m) => sum + m.word.length, 0);
  const coverage = clamp(matchedChars / Math.max(text.length, 1), 0, 1);

  return { matchedWords, roughVAD, roughEmotions, detectedStage, detectedTopics, coverage };
}

/** 将预标注结果格式化为LLM提示文本 */
export function preAnnotationToPrompt(pa: PreAnnotation): string {
  const emotionLines = pa.matchedWords
    .filter(m => m.weight >= 0.7)
    .slice(0, 10)
    .map(m => `  - "${m.word}" → ${m.label} (权重${m.weight})`)
    .join("\n");

  return `## 本地预标注（词库匹配，仅供参考）
- 粗略VAD: valence=${pa.roughVAD.valence.toFixed(2)}, arousal=${pa.roughVAD.arousal.toFixed(2)}, dominance=${pa.roughVAD.dominance.toFixed(2)}
- 匹配词(${pa.matchedWords.length}个):
${emotionLines || "  (无高权重匹配)"}
- 预估认知阶段: ${pa.detectedStage}
- 预估课题: ${pa.detectedTopics.join(", ")}
- 词库覆盖率: ${(pa.coverage * 100).toFixed(0)}%`;
}
