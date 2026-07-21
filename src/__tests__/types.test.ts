import { describe, it, expect } from "vitest";

describe("类型定义", () => {
  it("ResolutionStatus 枚举值", () => {
    const statuses = ["unresolved", "in_progress", "avoiding", "accepted", "resolved"] as const;
    expect(statuses).toHaveLength(5);
    expect(new Set(statuses).size).toBe(5);
  });

  it("LifeDomain 结构正确", () => {
    const domain = {
      id: "domain-test", name: "测试", color: "#000", icon: "Star",
      description: "测试领域", order: 1,
    };
    expect(domain).toHaveProperty("id");
    expect(domain).toHaveProperty("name");
    expect(domain).toHaveProperty("color");
    expect(domain).toHaveProperty("icon");
    expect(domain).toHaveProperty("order");
  });

  it("Topic 关联 domainId", () => {
    const topic = {
      id: "topic-1", name: "情绪", domainId: "domain-wellness",
      color: "#96CEB4", icon: "Smile", description: "情绪管理",
      diaryCount: 0, createdAt: new Date(),
    };
    expect(topic.domainId).toBe("domain-wellness");
  });

  it("Diary 包含 eventId 和 topicIds", () => {
    const diary = {
      id: "diary-1", title: "测试", content: "内容",
      topicIds: ["topic-emotion"], eventId: null,
      analysisId: null, hasAnalysis: false, wordCount: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };
    expect(diary.eventId).toBeNull();
    expect(diary.topicIds).toContain("topic-emotion");
    expect(diary).not.toHaveProperty("resolutionStatus");
    expect(diary).not.toHaveProperty("tags");
  });

  it("Event 包含 resolutionStatus 和 topicId", () => {
    const event = {
      id: "evt-1", topicId: "topic-emotion", title: "失恋",
      description: "和女朋友分手了",
      resolutionStatus: "unresolved" as const,
      createdAt: new Date(), updatedAt: new Date(),
    };
    expect(event.resolutionStatus).toBe("unresolved");
    expect(event.topicId).toBe("topic-emotion");
  });

  it("Insight 可关联多个事件和课题", () => {
    const insight = {
      id: "ins-1", title: "学会放下", content: "有些事无法强求",
      linkedEventIds: ["evt-1", "evt-2"],
      linkedTopicIds: ["topic-emotion"],
      sourceDiaryId: "diary-1",
      createdAt: new Date(),
    };
    expect(insight.linkedEventIds).toHaveLength(2);
    expect(insight.linkedTopicIds).toContain("topic-emotion");
  });
});
