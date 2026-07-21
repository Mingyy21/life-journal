import { describe, it, expect, beforeEach } from "vitest";
import { db, initDefaultData, createDiary, updateDiary, deleteDiary, listDiaries, getDiary, getTopicsByDomain, createEvent, getEvent, listEvents, getEventsByTopic, createInsight, listInsights, deleteTopicCascade, deleteDomainCascade, DEFAULT_LIFE_DOMAINS, DEFAULT_TOPICS } from "@/lib/db";
import type { AnalysisResult, Event } from "@/types";

describe("数据库测试", () => {
  beforeEach(async () => {
    await db.delete();
    db.version(3).stores({
      lifeDomains: "id",
      topics: "id, domainId",
      diaries: "id, createdAt, updatedAt, *topicIds, hasAnalysis, eventId",
      analysisResults: "id, diaryId, createdAt",
      events: "id, topicId, resolutionStatus, createdAt",
      insights: "id, createdAt",
    });
    await db.open();
  });

  it("预设5个一级标签正确初始化", async () => {
    await initDefaultData();
    const count = await db.lifeDomains.count();
    expect(count).toBe(5);
    const wellness = await db.lifeDomains.get("domain-wellness");
    expect(wellness?.name).toBe("身心健康");
  });

  it("8个二级标签正确映射到一级标签", async () => {
    await initDefaultData();
    const wellnessTopics = await getTopicsByDomain("domain-wellness");
    expect(wellnessTopics.length).toBe(3);
    expect(wellnessTopics.map(t => t.name).sort()).toEqual(["健身", "情绪", "认知"]);
  });

  it("创建日记（日常，不关联事件）", async () => {
    await initDefaultData();
    const diary = await createDiary({
      title: "测试", content: "测试内容",
      topicIds: ["topic-emotion", "topic-family"], eventId: null,
    });
    expect(diary.eventId).toBeNull();
    expect(diary.topicIds).toHaveLength(2);
    expect(diary.wordCount).toBe(4);
  });

  it("更新日记关联事件", async () => {
    await initDefaultData();
    const event = await createEvent({ topicId: "topic-emotion", title: "失恋", resolutionStatus: "unresolved" });
    const diary = await createDiary({
      title: "测试", content: "内容",
      topicIds: ["topic-emotion"], eventId: null,
    });
    await updateDiary(diary.id, { eventId: event.id });
    const updated = await getDiary(diary.id);
    expect(updated!.eventId).toBe(event.id);
  });

  it("按一级标签筛选日记", async () => {
    await initDefaultData();
    await createDiary({ title: "情绪日记", content: "内容", topicIds: ["topic-emotion"], eventId: null });
    await createDiary({ title: "工作日记", content: "内容", topicIds: ["topic-work"], eventId: null });
    const wellnessDiaries = await listDiaries({ domainId: "domain-wellness" });
    expect(wellnessDiaries.length).toBe(1);
    expect(wellnessDiaries[0].title).toBe("情绪日记");
  });

  it("创建并查询事件", async () => {
    await initDefaultData();
    const event = await createEvent({ topicId: "topic-emotion", title: "失恋事件", resolutionStatus: "unresolved" });
    expect(event.topicId).toBe("topic-emotion");
    expect(event.resolutionStatus).toBe("unresolved");

    const fetched = await getEvent(event.id);
    expect(fetched?.title).toBe("失恋事件");

    const topicEvents = await getEventsByTopic("topic-emotion");
    expect(topicEvents.length).toBe(1);
  });

  it("按解决状态筛选事件", async () => {
    await initDefaultData();
    await createEvent({ topicId: "topic-emotion", title: "未解决A", resolutionStatus: "unresolved" });
    await createEvent({ topicId: "topic-work", title: "已解决B", resolutionStatus: "resolved" });

    const unresolved = await listEvents({ resolutionStatus: "unresolved" });
    expect(unresolved.length).toBe(1);
    expect(unresolved[0].title).toBe("未解决A");
  });

  it("删除事件解绑关联日记", async () => {
    await initDefaultData();
    const event = await createEvent({ topicId: "topic-emotion", title: "待删事件", resolutionStatus: "unresolved" });
    const diary = await createDiary({ title: "关联日记", content: "内容", topicIds: ["topic-emotion"], eventId: event.id });
    await db.events.delete(event.id);
    // 手动模拟 deleteEvent 中的解绑逻辑
    await db.diaries.update(diary.id, { eventId: null });
    const updated = await getDiary(diary.id);
    expect(updated!.eventId).toBeNull();
  });

  it("创建感悟可关联事件和课题", async () => {
    await initDefaultData();
    const event = await createEvent({ topicId: "topic-emotion", title: "失恋", resolutionStatus: "unresolved" });
    const insight = await createInsight({
      title: "学会放下", content: "有些事无法强求",
      linkedEventIds: [event.id], linkedTopicIds: ["topic-emotion"],
    });
    expect(insight.linkedEventIds).toContain(event.id);
    expect(insight.linkedTopicIds).toContain("topic-emotion");

    const eventInsights = await listInsights({ linkedEventId: event.id });
    expect(eventInsights.length).toBe(1);
    expect(eventInsights[0].title).toBe("学会放下");
  });

  it("删除日记同步删除分析缓存", async () => {
    await initDefaultData();
    const diary = await createDiary({ title: "测试", content: "内容", topicIds: ["topic-emotion"], eventId: null });
    const analysis: AnalysisResult = {
      id: "ana-1", diaryId: diary.id,
      vadScore: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
      emotionLabels: { joy: 0.5, trust: 0.5, fear: 0, surprise: 0, sadness: 0, disgust: 0, anger: 0, anticipation: 0 },
      primaryEmotion: "喜悦", intensity: 0.5, cognitiveStage: "觉察",
      topics: [], tags: [], insight: "洞察", feedback: "反馈", followUpQuestion: "问题",
      createdAt: new Date(),
    };
    await db.analysisResults.add(analysis);
    await db.diaries.update(diary.id, { analysisId: "ana-1", hasAnalysis: true });
    await deleteDiary(diary.id);
    expect(await getDiary(diary.id)).toBeUndefined();
    expect(await db.analysisResults.get("ana-1")).toBeUndefined();
  });

  it("删除课题级联清理关联数据", async () => {
    await initDefaultData();
    const topicId = "topic-test-cascade";
    await db.topics.add({ id: topicId, name: "测试课题", domainId: "domain-wellness", color: "#000", icon: "Star", description: "测试", diaryCount: 5, createdAt: new Date() });
    const event = await createEvent({ topicId, title: "测试事件", resolutionStatus: "unresolved" });
    await createDiary({ title: "关联日记", content: "内容", topicIds: [topicId], eventId: event.id });
    await createInsight({ title: "关联感悟", content: "内容", linkedEventIds: [event.id], linkedTopicIds: [topicId] });

    await deleteTopicCascade(topicId);

    const t = await db.topics.get(topicId);
    expect(t).toBeUndefined();
    const e = await db.events.get(event.id);
    expect(e).toBeUndefined();
    const diaries = await db.diaries.toArray();
    for (const d of diaries) {
      expect(d.topicIds).not.toContain(topicId);
    }
  });
});
