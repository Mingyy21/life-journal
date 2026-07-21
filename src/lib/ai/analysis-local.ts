// 本地模拟分析（无API Key时的降级方案）
// 从 preannotate.ts 中提取，向后兼容原有 getMockAnalysis 接口
import { preAnnotate } from "./preannotate";
import type { VADScore, EmotionLabels } from "@/types";

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

export function getMockAnalysis(title: string, content: string) {
  const pre = preAnnotate(title, content);
  const v = pre.roughVAD.valence;
  const primaryEmotion = v > 0.15 ? "喜悦" : v < -0.15 ? "悲伤" : "平静";

  // 找分数最高的情绪
  let topEmotion = "joy";
  let topScore = 0;
  for (const [k, score] of Object.entries(pre.roughEmotions)) {
    if (score > topScore) { topScore = score; topEmotion = k; }
  }

  const intensity = clamp(Math.abs(v) * 0.7 + pre.roughVAD.arousal * 0.3, 0.1, 1);

  const emotionLabelMap: Record<string, string> = {
    joy:"喜悦", trust:"信任", fear:"恐惧", surprise:"惊讶",
    sadness:"悲伤", disgust:"厌恶", anger:"愤怒", anticipation:"期待",
  };

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
  };
}
