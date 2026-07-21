"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, FolderOpen, Plus, Lightbulb, Flag } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import SortSelector, { type SortMode } from "@/components/SortSelector";
import TopicDiaryList from "@/components/TopicDiaryList";
import CognitiveStageChart from "@/components/CognitiveStageChart";
import EventCard from "@/components/EventCard";
import InsightList from "@/components/InsightList";
import { getCognitiveEvolution } from "@/hooks/useCognitiveEvolution";
import type { EvolutionData } from "@/hooks/useCognitiveEvolution";
import { db, ensureDb } from "@/lib/db";
import { deleteInsight } from "@/lib/db";
import type { Diary, Topic, Event, Insight } from "@/types";

const RESOLUTION_LABELS: Record<string, string> = { unresolved: "未解决", in_progress: "解决中", avoiding: "逃避中", accepted: "已接纳", resolved: "已解决" };

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [topicEvents, setTopicEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [sort, setSort] = useState<SortMode>("recent");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "events" | "evolution" | "insights">("list");
  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null);
  const [eventStatusCounts, setEventStatusCounts] = useState<Record<string, number>>({});
  const [selectedDiaryIds, setSelectedDiaryIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [topicInsights, setTopicInsights] = useState<Insight[]>([]);

  useEffect(() => {
    async function load() {
      await ensureDb();
      const [t, ts, allDiaries, allAnalyses, topicEvs, allEvs, allInsights] = await Promise.all([
        db.topics.get(topicId),
        db.topics.toArray(),
        db.diaries.toArray(),
        db.analysisResults.toArray(),
        db.events.where("topicId").equals(topicId).toArray(),
        db.events.toArray(),
        db.insights.orderBy("createdAt").reverse().toArray(),
      ]);
      setTopic(t || null);
      setTopics(ts);
      const filtered = allDiaries.filter(d => (d.topicIds || []).includes(topicId));
      setDiaries(filtered);
      setTopicEvents(topicEvs);
      setAllEvents(allEvs);
      setTopicInsights(allInsights.filter(i => (i.linkedTopicIds || []).includes(topicId)));
      const aMap = new Map(allAnalyses.map(a => [a.diaryId, a]));
      setEvolutionData(getCognitiveEvolution(filtered, aMap));

      const ec: Record<string, number> = {};
      topicEvs.forEach(e => { ec[e.resolutionStatus] = (ec[e.resolutionStatus] || 0) + 1; });
      setEventStatusCounts(ec);

      setLoading(false);
    }
    load();
  }, [topicId]);

  const sortedDiaries = useMemo(() => {
    const copy = [...diaries];
    switch (sort) {
      case "recent":
        return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case "frequency":
        return copy;
      case "unresolved": {
        return copy.filter(d => !d.eventId).concat(copy.filter(d => d.eventId));
      }
    }
  }, [diaries, sort]);

  // 未归类日记（无eventId，近3天）
  const uncategorizedDiaries = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return diaries.filter(d => !d.eventId && d.createdAt >= threeDaysAgo);
  }, [diaries]);

  const handleBatchLink = async (eventId: string) => {
    for (const id of selectedDiaryIds) {
      await db.diaries.update(id, { eventId });
    }
    setSelectedDiaryIds(new Set());
    setBatchMode(false);
    // Reload
    const allDiaries = await db.diaries.toArray();
    setDiaries(allDiaries.filter(d => (d.topicIds || []).includes(topicId)));
    const evs = await db.events.where("topicId").equals(topicId).toArray();
    setTopicEvents(evs);
    const allEvs = await db.events.toArray();
    setAllEvents(allEvs);
  };

  const handleCreateAndLink = async () => {
    if (selectedDiaryIds.size === 0) return;
    const firstDiary = diaries.find(d => selectedDiaryIds.has(d.id));
    const eventId = crypto.randomUUID();
    await db.events.add({
      id: eventId, topicId,
      title: firstDiary ? firstDiary.title : "新建事件",
      description: "",
      resolutionStatus: "unresolved",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await handleBatchLink(eventId);
    router.push(`/events/${eventId}`);
  };

  const toggleDiary = (id: string) => {
    const next = new Set(selectedDiaryIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedDiaryIds(next);
  };

  const eventDiaryCount = useMemo(() => {
    const map = new Map<string, number>();
    diaries.forEach(d => { if (d.eventId) map.set(d.eventId, (map.get(d.eventId) || 0) + 1); });
    return map;
  }, [diaries]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>;
  if (!topic) return <div className="text-center py-16"><p className="text-calm-400 text-sm">课题不存在</p><Link href="/topics" className="text-primary-500 text-sm mt-2 inline-block hover:underline">返回课题列表</Link></div>;

  return (
    <div className="space-y-5">
      <Link href="/topics" className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回课题</Link>

      <div className="bg-white rounded-2xl border border-calm-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: topic.color }}>
            {topic.name[0]}
          </span>
          <div>
            <h1 className="text-lg font-serif font-semibold text-calm-900">{topic.name}</h1>
            <p className="text-xs text-calm-400">{topic.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-calm-50 text-calm-500">共 {diaries.length} 篇日记</span>
          {Object.entries(eventStatusCounts).map(([k, v]) => v > 0 && (
            <span key={k} className="px-2 py-0.5 rounded-full bg-calm-50 text-calm-500">{RESOLUTION_LABELS[k] || k}: {v}</span>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-calm-50 rounded-xl p-1">
        <button onClick={() => setActiveTab("list")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "list" ? "bg-calm-800 text-white shadow-sm" : "text-calm-400 hover:text-calm-600"
          }`}>
          日记列表
        </button>
        <button onClick={() => setActiveTab("events")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "events" ? "bg-calm-800 text-white shadow-sm" : "text-calm-400 hover:text-calm-600"
          }`}>
          事件 ({topicEvents.length})
        </button>
        <button onClick={() => setActiveTab("evolution")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "evolution" ? "bg-calm-800 text-white shadow-sm" : "text-calm-400 hover:text-calm-600"
          }`}>
          认知演化
        </button>
        <button onClick={() => setActiveTab("insights")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "insights" ? "bg-calm-800 text-white shadow-sm" : "text-calm-400 hover:text-calm-600"
          }`}>
          感悟 ({topicInsights.length})
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          {/* 未归类日记批量整理 */}
          {uncategorizedDiaries.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-medium text-amber-700">未归类日记 ({uncategorizedDiaries.length})</p>
                </div>
                {!batchMode ? (
                  <button onClick={() => setBatchMode(true)} className="text-xs text-amber-600 hover:text-amber-700">
                    批量整理
                  </button>
                ) : (
                  <button onClick={() => { setBatchMode(false); setSelectedDiaryIds(new Set()); }}
                    className="text-xs text-calm-400 hover:text-calm-600">取消</button>
                )}
              </div>

              {batchMode ? (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {uncategorizedDiaries.map(d => (
                      <label key={d.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedDiaryIds.has(d.id) ? "bg-amber-100" : "hover:bg-amber-100/50"}`}>
                        <input type="checkbox" checked={selectedDiaryIds.has(d.id)} onChange={() => toggleDiary(d.id)}
                          className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400" />
                        <span className="text-sm text-calm-700 truncate flex-1">{d.title}</span>
                      </label>
                    ))}
                  </div>
                  {selectedDiaryIds.size > 0 && (
                    <div className="flex gap-2 pt-2 border-t border-amber-200">
                      <button onClick={handleCreateAndLink}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500 text-white hover:bg-amber-600">
                        <Plus className="w-3 h-3" /> 新建事件并归入
                      </button>
                      {topicEvents.length > 0 && (
                        <select value="" onChange={e => e.target.value && handleBatchLink(e.target.value)}
                          className="flex-1 text-xs border border-amber-300 rounded-full px-3 py-1.5 text-amber-700 bg-white">
                          <option value="">归入已有事件...</option>
                          {topicEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-500">最近3天内写了{uncategorizedDiaries.length}篇日常记录，可以批量归入事件</p>
              )}
            </div>
          )}

          <SortSelector value={sort} onChange={setSort} />
          <TopicDiaryList diaries={sortedDiaries} topics={topics} events={allEvents} />
        </>
      ) : activeTab === "events" ? (
        <div className="space-y-2">
          {topicEvents.length === 0 ? (
            <EmptyState icon={<Flag className="w-12 h-12" />} title="该课题下还没有事件" description="为这个课题创建一个事件来跟踪进度" actionLabel="去写日记" actionHref="/" />
          ) : (
            topicEvents.map(ev => (
              <EventCard key={ev.id} event={ev} diaryCount={eventDiaryCount.get(ev.id) || 0} />
            ))
          )}
        </div>
      ) : activeTab === "insights" ? (
        <div>
          <InsightList
            insights={topicInsights}
            topics={topics}
            events={allEvents}
            onDeleteInsight={async (id) => {
              await deleteInsight(id);
              setTopicInsights(prev => prev.filter(i => i.id !== id));
            }}
          />
        </div>
      ) : (
        evolutionData && <CognitiveStageChart points={evolutionData.points} />
      )}
    </div>
  );
}
