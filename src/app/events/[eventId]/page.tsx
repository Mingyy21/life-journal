"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Lightbulb, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import EventTimeline from "@/components/EventTimeline";
import InsightList from "@/components/InsightList";
import InsightForm from "@/components/InsightForm";
import { createInsight, deleteInsight } from "@/lib/db";
import type { Event, Diary, Topic, Insight } from "@/types";

const STATUS_OPTIONS = [
  { value: "unresolved", label: "未解决" },
  { value: "in_progress", label: "解决中" },
  { value: "avoiding", label: "逃避中" },
  { value: "accepted", label: "已接纳" },
  { value: "resolved", label: "已解决" },
];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showInsightForm, setShowInsightForm] = useState(false);

  const load = useCallback(async () => {
    const [ev, allDiaries, allTopics, allEvs, allInsights] = await Promise.all([
      db.events.get(eventId),
      db.diaries.toArray(),
      db.topics.toArray(),
      db.events.toArray(),
      db.insights.orderBy("createdAt").reverse().toArray(),
    ]);
    setEvent(ev || null);
    setTopics(allTopics);
    setAllEvents(allEvs);
    setDiaries(allDiaries.filter(d => d.eventId === eventId));
    setInsights(allInsights.filter(i => (i.linkedEventIds || []).includes(eventId)));
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (status: string) => {
    if (!event) return;
    setUpdating(true);
    await db.events.update(eventId, { resolutionStatus: status as any, updatedAt: new Date() });
    setEvent({ ...event, resolutionStatus: status as any, updatedAt: new Date() });
    setUpdating(false);
  };

  const handleSaveInsight = async (input: { title: string; content: string; linkedEventIds: string[]; linkedTopicIds: string[] }) => {
    await createInsight({ ...input, linkedEventIds: [...input.linkedEventIds, eventId] });
    setShowInsightForm(false);
    await load();
  };

  const handleDeleteInsight = async (id: string) => {
    await deleteInsight(id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    await db.events.delete(eventId);
    for (const d of diaries) {
      await db.diaries.update(d.id, { eventId: null });
    }
    router.push("/events");
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>;
  if (!event) return <div className="text-center py-16"><p className="text-calm-400 text-sm">事件不存在</p><Link href="/events" className="text-primary-500 text-sm mt-2 inline-block hover:underline">返回事件列表</Link></div>;

  const topic = topics.find(t => t.id === event.topicId);

  return (
    <div className="space-y-5">
      <Link href="/events" className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</Link>

      {/* 事件头部 */}
      <div className="bg-white rounded-2xl border border-calm-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg font-serif font-semibold text-calm-900">{event.title}</h1>
            {topic && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: topic.color }}>
                {topic.name}
              </span>
            )}
          </div>
        </div>
        {event.description && <p className="text-sm text-calm-500 mb-4">{event.description}</p>}

        <div>
          <p className="text-xs text-calm-400 mb-2">处理状态</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
                disabled={updating}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  event.resolutionStatus === opt.value ? "bg-calm-800 text-white shadow-sm" : "text-calm-500 bg-calm-50 hover:bg-calm-100"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 关联日记 */}
      <div className="bg-white rounded-2xl border border-calm-200 p-5">
        <h2 className="text-sm font-medium text-calm-700 mb-4">关联日记 ({diaries.length})</h2>
        <EventTimeline diaries={diaries} topics={topics} />
      </div>

      {/* 感悟 */}
      <div className="bg-white rounded-2xl border border-calm-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-calm-700 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" /> 感悟 ({insights.length})
          </h2>
          {!showInsightForm && (
            <button onClick={() => setShowInsightForm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
              <Plus className="w-3.5 h-3.5" /> 新建
            </button>
          )}
        </div>
        {showInsightForm && (
          <InsightForm
            topics={topics}
            events={allEvents}
            initialEventIds={[eventId]}
            initialTopicIds={topic ? [topic.id] : []}
            onSave={handleSaveInsight}
            onCancel={() => setShowInsightForm(false)}
          />
        )}
        <InsightList insights={insights} topics={topics} events={allEvents} onDeleteInsight={handleDeleteInsight} />
      </div>

      {/* 删除 */}
      <div className="text-center">
        {deleteConfirm ? (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100 text-center">
            <p className="text-sm text-red-500 mb-3">确定要删除这个事件吗？关联的日记会保留但解除关联。</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-1.5 text-xs font-medium rounded-full bg-white text-calm-500 border border-calm-200">取消</button>
              <button onClick={handleDelete} className="px-4 py-1.5 text-xs font-medium rounded-full bg-red-500 text-white hover:bg-red-600">确认删除</button>
            </div>
          </div>
        ) : (
          <button onClick={handleDelete}
            className="flex items-center gap-1 mx-auto px-4 py-2 text-xs text-red-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> 删除事件
          </button>
        )}
      </div>
    </div>
  );
}
