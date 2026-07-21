import { describe, it, expect, vi } from "vitest";

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: () => {} } };
  },
}));

import { getMockAnalysis } from "@/lib/ai";

describe("AI分析", () => {
  it("正向文本→正向愉悦度和喜悦情绪", () => {
    const r = getMockAnalysis("今天好开心", "今天特别开心，和朋友一起玩很高兴");
    expect(r.vadScore.valence).toBeGreaterThan(0);
    expect(r.primaryEmotion).toBe("喜悦");
    expect(r.emotionLabels.joy).toBeGreaterThan(0);
  });

  it("负向文本→负向愉悦度和悲伤情绪", () => {
    const r = getMockAnalysis("难过的一天", "今天很难过，感到孤独和痛苦");
    expect(r.vadScore.valence).toBeLessThan(0);
    expect(r.primaryEmotion).toBe("悲伤");
  });

  it("平静文本→较低唤醒度", () => {
    const r = getMockAnalysis("平静的一天", "今天很平静，顺其自然");
    expect(r.vadScore.arousal).toBeLessThan(0.3);
  });

  it("混合文本→愉悦度在中间范围", () => {
    const r = getMockAnalysis("今天", "开心但还是有点难过");
    expect(r.vadScore.valence).toBeGreaterThan(-0.5);
    expect(r.vadScore.valence).toBeLessThan(0.5);
  });

  it("VAD值在合法范围", () => {
    const r = getMockAnalysis("各种情绪", "开心 难过 焦虑 平静");
    expect(r.vadScore.valence).toBeGreaterThanOrEqual(-1);
    expect(r.vadScore.valence).toBeLessThanOrEqual(1);
    expect(r.vadScore.arousal).toBeGreaterThanOrEqual(0);
    expect(r.vadScore.arousal).toBeLessThanOrEqual(1);
  });

  it("返回结构完整性", () => {
    const r = getMockAnalysis("测试", "测试内容");
    expect(r).toHaveProperty("vadScore");
    expect(r.vadScore).toHaveProperty("valence");
    expect(r.vadScore).toHaveProperty("arousal");
    expect(r.vadScore).toHaveProperty("dominance");
    expect(r).toHaveProperty("emotionLabels");
    expect(r.emotionLabels).toHaveProperty("joy");
    expect(r.emotionLabels).toHaveProperty("sadness");
    expect(r).toHaveProperty("primaryEmotion");
    expect(r).toHaveProperty("cognitiveStage");
    expect(r).toHaveProperty("insight");
    expect(r).toHaveProperty("feedback");
    expect(r).toHaveProperty("followUpQuestion");
  });
});
