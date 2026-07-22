// 人生手记 - Supabase 数据库层
import type { Diary, Topic, LifeDomain, AnalysisResult, Event, Insight, CreateEventInput, UpdateEventInput, CreateInsightInput, EventFilter, InsightFilter } from "@/types";
import { supabaseProxy } from "@/lib/supabase/dexie-compat";

export const db = supabaseProxy;

// ── 统一数据库打开 ──

export async function ensureDb(): Promise<void> {
  // Supabase 不需要"打开"数据库，只需确保已认证
  try {
    await db.open();
  } catch {
    throw new Error("请先登录");
  }
  await initDefaultData();
}

// ── 默认数据 ──

export const DEFAULT_LIFE_DOMAINS: LifeDomain[] = [
  { id: "domain-wellness", name: "身心健康", color: "#4ECDC4", icon: "Heart", description: "身体、心理、情绪的内在健康", order: 1 },
  { id: "domain-relationships", name: "人际关系", color: "#FF6B6B", icon: "Users", description: "与他人的深度连接", order: 2 },
  { id: "domain-career", name: "事业成长", color: "#45B7D1", icon: "BookOpen", description: "职业发展与能力提升", order: 3 },
  { id: "domain-identity", name: "自我认同", color: "#FFEAA7", icon: "Brain", description: "自我认知、价值观与身份感", order: 4 },
  { id: "domain-meaning", name: "生活意义", color: "#DDA0DD", icon: "Star", description: "目标感、精神追求与超越性体验", order: 5 },
];

export const DEFAULT_TOPICS: Topic[] = [
  { id: "topic-emotion", name: "情绪", domainId: "domain-wellness", color: "#96CEB4", icon: "Smile", description: "情绪波动、情感管理与自我调节", diaryCount: 0, createdAt: new Date() },
  { id: "topic-cognition", name: "认知", domainId: "domain-wellness", color: "#FFEAA7", icon: "Brain", description: "思维模式、信念体系与认知成长", diaryCount: 0, createdAt: new Date() },
  { id: "topic-fitness", name: "健身", domainId: "domain-wellness", color: "#DDA0DD", icon: "Dumbbell", description: "身体健康、运动习惯与自我管理", diaryCount: 0, createdAt: new Date() },
  { id: "topic-friendship", name: "友情", domainId: "domain-relationships", color: "#FF6B6B", icon: "Users", description: "与朋友的相处、矛盾与成长", diaryCount: 0, createdAt: new Date() },
  { id: "topic-family", name: "亲情", domainId: "domain-relationships", color: "#FFA94D", icon: "Heart", description: "与家人的关系、理解与和解", diaryCount: 0, createdAt: new Date() },
  { id: "topic-love", name: "爱情", domainId: "domain-relationships", color: "#F06595", icon: "HeartHandshake", description: "恋爱关系、亲密关系中的成长", diaryCount: 0, createdAt: new Date() },
  { id: "topic-work", name: "工作", domainId: "domain-career", color: "#4ECDC4", icon: "Briefcase", description: "职业发展、工作困境与突破", diaryCount: 0, createdAt: new Date() },
  { id: "topic-study", name: "学习", domainId: "domain-career", color: "#45B7D1", icon: "BookOpen", description: "学习成长、技能提升与认知拓展", diaryCount: 0, createdAt: new Date() },
];

// ── 初始化 ──

export async function initDefaultData(): Promise<void> {
  for (const d of DEFAULT_LIFE_DOMAINS) {
    const existing = await db.lifeDomains.get(d.id);
    if (!existing) await db.lifeDomains.add(d);
  }
  for (const t of DEFAULT_TOPICS) {
    const existing = await db.topics.get(t.id);
    if (!existing) await db.topics.add(t);
  }
}

// ── 日记 CRUD ──

export async function createDiary(input: { title: string; content: string; topicIds: string[]; eventId: string | null }): Promise<Diary> {
  const diary: Diary = {
    id: crypto.randomUUID(),
    title: input.title,
    content: input.content,
    topicIds: input.topicIds,
    eventId: input.eventId || null,
    analysisId: null,
    hasAnalysis: false,
    wordCount: input.content.length,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.diaries.add(diary);
  for (const topicId of input.topicIds) {
    const topic = await db.topics.get(topicId);
    if (topic) await db.topics.update(topicId, { diaryCount: topic.diaryCount + 1 } as any);
  }
  return diary;
}

export async function getDiary(id: string): Promise<Diary | undefined> {
  return db.diaries.get(id);
}

export async function updateDiary(id: string, input: { title?: string; content?: string; topicIds?: string[]; eventId?: string | null }): Promise<void> {
  const updates: Partial<Diary> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined) { updates.content = input.content; updates.wordCount = input.content.length; }
  if (input.topicIds !== undefined) updates.topicIds = input.topicIds;
  if (input.eventId !== undefined) updates.eventId = input.eventId;
  await db.diaries.update(id, updates as any);
}

export async function deleteDiary(id: string): Promise<void> {
  const diary = await db.diaries.get(id);
  if (!diary) return;
  for (const topicId of (diary.topicIds || [])) {
    const topic = await db.topics.get(topicId);
    if (topic && topic.diaryCount > 0) await db.topics.update(topicId, { diaryCount: topic.diaryCount - 1 } as any);
  }
  if (diary.analysisId) await db.analysisResults.delete(diary.analysisId);
  await db.diaries.delete(id);
}

export async function listDiaries(filter?: { domainId?: string; topicId?: string; eventId?: string; resolutionStatus?: string; hasAnalysis?: boolean; keyword?: string; dateFrom?: Date; dateTo?: Date }, limit = 50, offset = 0): Promise<Diary[]> {
  let diaries: Diary[];
  if (filter?.dateFrom && filter?.dateTo) {
    diaries = await db.diaries.where("createdAt").between(filter.dateFrom, filter.dateTo).reverse().toArray();
  } else {
    diaries = await db.diaries.orderBy("createdAt").reverse().toArray();
  }
  let result = diaries;
  if (filter?.domainId) {
    const domainTopics = await getTopicsByDomain(filter.domainId);
    const domainTopicIds = new Set(domainTopics.map(t => t.id));
    result = result.filter(d => (d.topicIds || []).some(tid => domainTopicIds.has(tid)));
  }
  if (filter?.topicId) result = result.filter(d => (d.topicIds || []).includes(filter.topicId!));
  if (filter?.eventId) result = result.filter(d => d.eventId === filter.eventId);
  if (filter?.resolutionStatus) {
    const eventsWithStatus = await db.events.where("resolutionStatus").equals(filter.resolutionStatus).toArray();
    const eventIds = new Set(eventsWithStatus.map(e => e.id));
    result = result.filter(d => d.eventId && eventIds.has(d.eventId));
  }
  if (filter?.hasAnalysis !== undefined) result = result.filter(d => d.hasAnalysis === filter.hasAnalysis);
  if (filter?.keyword) { const kw = filter.keyword.toLowerCase(); result = result.filter(d => d.title.toLowerCase().includes(kw) || d.content.toLowerCase().includes(kw)); }
  return result.slice(offset, offset + limit);
}

// ── 分析结果 ──

export async function saveAnalysis(analysis: AnalysisResult): Promise<void> {
  await db.analysisResults.put(analysis);
  await db.diaries.update(analysis.diaryId, { analysisId: analysis.id, hasAnalysis: true } as any);
}

export async function getAnalysis(diaryId: string): Promise<AnalysisResult | undefined> {
  return db.analysisResults.where("diaryId").equals(diaryId).first();
}

// ── 事件 CRUD ──

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const event: Event = {
    id: crypto.randomUUID(),
    topicId: input.topicId,
    title: input.title,
    description: input.description || "",
    resolutionStatus: input.resolutionStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.events.add(event);
  return event;
}

export async function getEvent(id: string): Promise<Event | undefined> {
  return db.events.get(id);
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<void> {
  const updates: Partial<Event> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.resolutionStatus !== undefined) updates.resolutionStatus = input.resolutionStatus;
  await db.events.update(id, updates as any);
}

export async function deleteEvent(id: string): Promise<void> {
  const diariesWithEvent = await db.diaries.where("eventId").equals(id).toArray();
  for (const d of diariesWithEvent) {
    await db.diaries.update(d.id, { eventId: null } as any);
  }
  const linkedInsights = await db.insights.filter(i => (i.linkedEventIds || []).includes(id)).toArray();
  for (const ins of linkedInsights) {
    await db.insights.update(ins.id, { linkedEventIds: (ins.linkedEventIds || []).filter(eid => eid !== id) } as any);
  }
  await db.events.delete(id);
}

export async function listEvents(filter?: EventFilter): Promise<Event[]> {
  if (filter?.topicId) {
    return db.events.where("topicId").equals(filter.topicId).reverse().sortBy("createdAt");
  } else if (filter?.resolutionStatus) {
    return db.events.where("resolutionStatus").equals(filter.resolutionStatus).reverse().sortBy("createdAt");
  }
  return db.events.orderBy("createdAt").reverse().toArray();
}

export async function getEventsByTopic(topicId: string): Promise<Event[]> {
  return db.events.where("topicId").equals(topicId).reverse().sortBy("createdAt");
}

export async function getUncategorizedDiaries(topicId: string, sinceDays: number): Promise<Diary[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const all = await db.diaries.where("createdAt").aboveOrEqual(since).reverse().toArray();
  return all.filter(d => (d.topicIds || []).includes(topicId) && !d.eventId);
}

// ── 感悟 CRUD ──

export async function createInsight(input: CreateInsightInput): Promise<Insight> {
  const insight: Insight = {
    id: crypto.randomUUID(),
    title: input.title,
    content: input.content,
    linkedEventIds: input.linkedEventIds,
    linkedTopicIds: input.linkedTopicIds,
    sourceDiaryId: input.sourceDiaryId,
    createdAt: new Date(),
  };
  await db.insights.add(insight);
  return insight;
}

export async function getInsight(id: string): Promise<Insight | undefined> {
  return db.insights.get(id);
}

export async function deleteInsight(id: string): Promise<void> {
  await db.insights.delete(id);
}

export async function listInsights(filter?: InsightFilter): Promise<Insight[]> {
  let insights = await db.insights.orderBy("createdAt").reverse().toArray();
  if (filter?.linkedEventId) insights = insights.filter(i => (i.linkedEventIds || []).includes(filter.linkedEventId!));
  if (filter?.linkedTopicId) insights = insights.filter(i => (i.linkedTopicIds || []).includes(filter.linkedTopicId!));
  return insights;
}

export async function getInsightsByEvent(eventId: string): Promise<Insight[]> {
  return (await db.insights.orderBy("createdAt").reverse().toArray())
    .filter(i => (i.linkedEventIds || []).includes(eventId));
}

export async function getInsightsByTopic(topicId: string): Promise<Insight[]> {
  return (await db.insights.orderBy("createdAt").reverse().toArray())
    .filter(i => (i.linkedTopicIds || []).includes(topicId));
}

// ── 课题/领域管理 ──

export async function createTopic(input: { name: string; domainId: string; color: string; icon: string; description: string }): Promise<Topic> {
  const topic: Topic = {
    id: crypto.randomUUID(),
    name: input.name,
    domainId: input.domainId,
    color: input.color,
    icon: input.icon,
    description: input.description,
    diaryCount: 0,
    createdAt: new Date(),
  };
  await db.topics.add(topic);
  return topic;
}

export async function updateTopic(id: string, input: Partial<Pick<Topic, "name" | "domainId" | "color" | "icon" | "description">>): Promise<void> {
  await db.topics.update(id, input as any);
}

export async function deleteTopicCascade(id: string): Promise<void> {
  const diaries = await db.diaries.filter(d => (d.topicIds || []).includes(id)).toArray();
  for (const diary of diaries) {
    await db.diaries.update(diary.id, { topicIds: (diary.topicIds || []).filter(tid => tid !== id) } as any);
  }
  const insights = await db.insights.filter(i => (i.linkedTopicIds || []).includes(id)).toArray();
  for (const ins of insights) {
    await db.insights.update(ins.id, { linkedTopicIds: (ins.linkedTopicIds || []).filter(tid => tid !== id) } as any);
  }
  const events = await db.events.where("topicId").equals(id).toArray();
  for (const event of events) {
    await deleteEvent(event.id);
  }
  await db.topics.delete(id);
}

export async function createDomain(input: { name: string; color: string; icon: string; description: string }): Promise<LifeDomain> {
  const domains = await db.lifeDomains.orderBy("order").toArray();
  const maxOrder = domains.length > 0 ? Math.max(...domains.map(d => (d as any).order || 0)) : 0;
  const domain: LifeDomain = {
    id: crypto.randomUUID(),
    name: input.name,
    color: input.color,
    icon: input.icon,
    description: input.description,
    order: maxOrder + 1,
  };
  await db.lifeDomains.add(domain);
  return domain;
}

export async function updateDomain(id: string, input: Partial<Pick<LifeDomain, "name" | "color" | "icon" | "description">>): Promise<void> {
  await db.lifeDomains.update(id, input as any);
}

export async function deleteDomainCascade(id: string): Promise<void> {
  const topics = await getTopicsByDomain(id);
  for (const topic of topics) {
    await deleteTopicCascade(topic.id);
  }
  await db.lifeDomains.delete(id);
}

// ── 辅助 ──

export async function getTopicsByDomain(domainId: string): Promise<Topic[]> {
  return db.topics.where("domainId").equals(domainId).toArray();
}

export async function getDiaryCountByTopic(topicId: string): Promise<number> {
  const diaries = await db.diaries.filter(d => (d.topicIds || []).includes(topicId)).toArray();
  return diaries.length;
}
