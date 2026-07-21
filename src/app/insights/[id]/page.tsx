"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lightbulb, Trash2, Link2, Tag } from "lucide-react";
import Link from "next/link";
import { db, ensureDb } from "@/lib/db";
import type { Insight, Topic, Event } from "@/types";
import { ClientDate } from "@/components/ClientDate";
import { EventBadge } from "@/components/EventBadge";

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const insightId = params.id as string;
  const [insight, setInsight] = useState<Insight | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      await ensureDb();
      const [ins, ts, es] = await Promise.all([
        db.insights.get(insightId),
        db.topics.toArray(),
        db.events.toArray(),
      ]);
      setInsight(ins || null);
      setTopics(ts);
      setEvents(es);
      setLoading(false);
    }
    load();
  }, [insightId]);

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    if (insight) await db.insights.delete(insight.id);
    router.push("/insights");
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>;
  if (!insight) return <div className="text-center py-16"><p className="text-calm-400 text-sm">感悟不存在</p><Link href="/insights" className="text-primary-500 text-sm mt-2 inline-block hover:underline">返回感悟列表</Link></div>;

  const topicMap = new Map(topics.map(t => [t.id, t]));
  const linkedEvents = events.filter(e => insight.linkedEventIds.includes(e.id));
  const linkedTopics = insight.linkedTopicIds.map(tid => topicMap.get(tid)).filter(Boolean) as Topic[];

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>

      <div className="bg-white rounded-2xl border border-calm-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-serif font-semibold text-calm-900">{insight.title}</h1>
            <p className="text-xs text-calm-400 mt-1"><ClientDate date={insight.createdAt} format="full" /></p>
          </div>
        </div>

        <div className="text-calm-700 leading-relaxed whitespace-pre-wrap text-base mb-6">{insight.content}</div>

        {/* 关联标签 */}
        {(linkedTopics.length > 0 || linkedEvents.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {linkedTopics.map(t => (
              <Link key={t.id} href={`/topics/${t.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: t.color }}>
                <Tag className="w-3 h-3" /> {t.name}
              </Link>
            ))}
            {linkedEvents.map(ev => (
              <EventBadge key={ev.id} eventId={ev.id} eventTitle={ev.title} status={ev.resolutionStatus} />
            ))}
          </div>
        )}

        {/* 来源日记 */}
        {insight.sourceDiaryId && (
          <div className="flex items-center gap-1.5 text-xs">
            <Link2 className="w-3 h-3 text-calm-400" />
            <Link href={`/diary/${insight.sourceDiaryId}`} className="text-calm-500 hover:text-primary-500 underline">查看来源日记</Link>
          </div>
        )}
      </div>

      {/* 删除 */}
      <div className="text-center">
        {deleteConfirm ? (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100 text-center">
            <p className="text-sm text-red-500 mb-3">确定要删除这条感悟吗？</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-1.5 text-xs font-medium rounded-full bg-white text-calm-500 border border-calm-200">取消</button>
              <button onClick={handleDelete} className="px-4 py-1.5 text-xs font-medium rounded-full bg-red-500 text-white hover:bg-red-600">确认删除</button>
            </div>
          </div>
        ) : (
          <button onClick={handleDelete}
            className="flex items-center gap-1 mx-auto px-4 py-2 text-xs text-red-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> 删除感悟
          </button>
        )}
      </div>
    </div>
  );
}
