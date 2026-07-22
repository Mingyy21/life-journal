"use client";
import { useState, useMemo } from "react";
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
import { db, createInsight, deleteInsight } from "@/lib/db";
import { useTopics, useTopicDiaries, useTopicEvents, useTopicInsights, useEvents, useAllDiaries, useDiaries } from "@/hooks/useData";
import { useInit } from "@/components/InitProvider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useData";
import type { Diary, Topic, Event, Insight } from "@/types";

const RESOLUTION_LABELS: Record<string, string> = { unresolved: "未解决", in_progress: "解决中", avoiding: "逃避中", accepted: "已接纳", resolved: "已解决" };

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const topicId = params.topicId as string;
  const { ready } = useInit();

  const { data: allTopics = [] } = useTopics();
  const topic = allTopics.find(t => t.id === topicId) || null;
  const { data: diaries = [] } = useTopicDiaries(topicId);
  const { data: topicEvents = [] } = useTopicEvents(topicId);
  const { data: allEvents = [] } = useEvents();
  const { data: topicInsights = [] } = useTopicInsights(topicId);
  const { data: allDiaries = [] } = useAllDiaries();

  const [sort, setSort] = useState<SortMode>("recent");
  const [activeTab, setActiveTab] = useState<"list" | "events" | "evolution" | "insights" | "intervention">("list");
  const [selectedDiaryIds, setSelectedDiaryIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchEventTitle, setBatchEventTitle] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Cognitive evolution data (computed from diaries + analyses)
  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null);
  // Load analyses for evolution on mount
  useMemo(async () => {
    const allAnalyses = await db.analysisResults.toArray();
    const aMap = new Map(allAnalyses.map(a => [a.diaryId, a]));
    setEvolutionData(getCognitiveEvolution(diaries, aMap));
  }, [diaries]);

  const eventStatusCounts = useMemo(() => {
    const ec: Record<string, number> = {};
    topicEvents.forEach(e => { ec[e.resolutionStatus] = (ec[e.resolutionStatus] || 0) + 1; });
    return ec;
  }, [topicEvents]);

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

  const uncategorizedDiaries = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return diaries.filter(d => !d.eventId && d.createdAt >= threeDaysAgo);
  }, [diaries]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.topicDiaries(topicId) });
    qc.invalidateQueries({ queryKey: queryKeys.topicEvents(topicId) });
    qc.invalidateQueries({ queryKey: queryKeys.events });
    qc.invalidateQueries({ queryKey: queryKeys.diaries() });
  };

  const handleBatchLink = async (eventId: string) => {
    for (const id of selectedDiaryIds) {
      await db.diaries.update(id, { eventId });
    }
    setSelectedDiaryIds(new Set());
    setBatchMode(false);
    invalidate();
  };

  const handleCreateAndLink = async (title: string) => {
    if (selectedDiaryIds.size === 0) return;
    const eventId = crypto.randomUUID();
    await db.events.add({
      id: eventId, topicId,
      title: title.trim() || "新建事件",
      description: "",
      resolutionStatus: "unresolved",
      createdAt: new Date(), updatedAt: new Date(),
    });
    await handleBatchLink(eventId);
    router.push(`/events/${eventId}`);
  };

  const openBatchDialog = () => {
    const firstDiary = diaries.find(d => selectedDiaryIds.has(d.id));
    setBatchEventTitle(firstDiary?.title || "新建事件");
    setShowBatchDialog(true);
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

  const handleSaveFeedback = async () => {
    if (!aiFeedback.trim() || !topic) return;
    setSaving(true);
    try {
      await createInsight({
        title: `AI 对话：${topic.name}`,
        content: aiFeedback.trim(),
        linkedEventIds: [],
        linkedTopicIds: [topicId],
        sourceDiaryId: undefined,
      });
      setAiFeedback("");
      setSavedMsg("已保存为感悟");
      setTimeout(() => setSavedMsg(""), 2000);
      qc.invalidateQueries({ queryKey: queryKeys.topicInsights(topicId) });
      qc.invalidateQueries({ queryKey: queryKeys.insights });
    } catch {
      setSavedMsg("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>;
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
        <button onClick={() => setActiveTab("intervention")}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "intervention" ? "bg-calm-800 text-white shadow-sm" : "text-calm-400 hover:text-calm-600"
          }`}>
          AI 干预
        </button>
      </div>

      {activeTab === "list" ? (
        <>
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
                    <div className="flex flex-col gap-2 pt-2 border-t border-amber-200">
                      <select value="" onChange={e => { if (e.target.value) handleBatchLink(e.target.value); }}
                        className="w-full text-xs border border-amber-300 rounded-full px-3 py-2 text-amber-700 bg-white">
                        <option value="">归入已有事件...</option>
                        {allEvents.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                      <button onClick={openBatchDialog}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                        <Plus className="w-3 h-3" /> 新建事件并归入
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-500">最近3天内写了{uncategorizedDiaries.length}篇日常记录，可以批量归入事件</p>
              )}
            </div>
          )}

          <SortSelector value={sort} onChange={setSort} />
          <TopicDiaryList diaries={sortedDiaries} topics={allTopics} events={allEvents} />
        </>
      ) : activeTab === "intervention" ? (
        <div className="space-y-4">
          {/* ── 第一步：复制提示词去 DeepSeek ── */}
          <div className="bg-white rounded-2xl border border-calm-200 p-5">
            <h3 className="text-sm font-serif font-semibold text-calm-900 mb-1">
              与 AI 深入探讨「{topic?.name || "..."}」
            </h3>
            <p className="text-xs text-calm-400 mb-4">
              复制提示词 → 粘贴到 DeepSeek → 与 AI 对话
            </p>

            <div className="bg-calm-50 rounded-xl p-4 mb-4">
              <pre className="text-xs text-calm-600 whitespace-pre-wrap leading-relaxed select-all">
                {(() => {
                  const recent = diaries.slice(0, 8);
                  const ctx = recent.length > 0
                    ? recent.map(d => `  · 《${d.title}》（${d.createdAt.toLocaleDateString()}）`).join("\n")
                    : "  （暂无日记记录）";
                  return `我正在使用「人生手记」记录我的生活。
我想和你深入聊聊「${topic?.name || "..."}」这个课题。

我最近的记录：
${ctx}

我想请你：
1. 帮我分析我在这个课题上的情绪变化和认知模式
2. 指出我可能存在的思维盲区
3. 给我一些具体的建议`;
                })()}
              </pre>
            </div>

            <button
              onClick={() => {
                const recent = diaries.slice(0, 8);
                const ctx = recent.length > 0
                  ? recent.map(d => `  · 《${d.title}》（${d.createdAt.toLocaleDateString()}）`).join("\n")
                  : "  （暂无日记记录）";
                navigator.clipboard.writeText(
                  `我正在使用「人生手记」记录我的生活。\n我想和你深入聊聊「${topic?.name || "..."}」这个课题。\n\n我最近的记录：\n${ctx}\n\n我想请你：\n1. 帮我分析我在这个课题上的情绪变化和认知模式\n2. 指出我可能存在的思维盲区\n3. 给我一些具体的建议`
                );
                window.open("https://chat.deepseek.com", "_blank");
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-all active:scale-95"
            >
              复制提示词并打开 DeepSeek
            </button>
          </div>

          {/* ── 第二步：把 AI 的回答贴回来 ── */}
          <div className="bg-white rounded-2xl border border-calm-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-serif font-semibold text-calm-900">把 AI 的回答保存回来</h3>
              <span className="text-xs text-primary-500">第 2 步</span>
            </div>
            <p className="text-xs text-calm-400 mb-3">
              在 DeepSeek 聊完后，把它的回答复制回来粘贴到这里，保存为一条感悟。
            </p>

            <textarea
              value={aiFeedback}
              onChange={e => setAiFeedback(e.target.value)}
              placeholder="将 DeepSeek 的回答粘贴到这里..."
              rows={6}
              className="w-full px-3 py-2 text-xs border border-calm-200 rounded-xl outline-none focus:border-primary-300 resize-none mb-3"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveFeedback}
                disabled={!aiFeedback.trim() || saving}
                className="px-5 py-2 text-xs font-medium rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-all active:scale-95"
              >
                {saving ? "保存中..." : "保存为感悟"}
              </button>
              {savedMsg && <span className="text-xs text-green-600">{savedMsg}</span>}
            </div>
          </div>
        </div>
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
            topics={allTopics}
            events={allEvents}
            onDeleteInsight={async (id) => {
              await deleteInsight(id);
              qc.invalidateQueries({ queryKey: queryKeys.topicInsights(topicId) });
              qc.invalidateQueries({ queryKey: queryKeys.insights });
            }}
          />
        </div>
      ) : (
        evolutionData && <CognitiveStageChart points={evolutionData.points} />
      )}

      {/* 批量创建事件命名弹窗 */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-popup w-full max-w-sm p-6 animate-scale-in">
            <h3 className="text-base font-serif font-semibold text-calm-900 mb-4">新建事件</h3>
            <input
              type="text" value={batchEventTitle}
              onChange={e => setBatchEventTitle(e.target.value)}
              placeholder="输入事件名称"
              autoFocus
              className="w-full px-4 py-2.5 text-sm border border-calm-200 rounded-lg outline-none focus:border-primary-300 mb-4"
              onKeyDown={e => { if (e.key === "Enter" && batchEventTitle.trim()) { setShowBatchDialog(false); handleCreateAndLink(batchEventTitle); } }}
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowBatchDialog(false)}
                className="px-4 py-2 text-xs font-medium rounded-full bg-calm-50 text-calm-500 hover:bg-calm-100">取消</button>
              <button onClick={() => { setShowBatchDialog(false); handleCreateAndLink(batchEventTitle); }}
                disabled={!batchEventTitle.trim()}
                className="px-4 py-2 text-xs font-medium rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40">确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
