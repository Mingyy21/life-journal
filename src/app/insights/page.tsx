"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Lightbulb } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { db, ensureDb } from "@/lib/db";
import InsightList from "@/components/InsightList";
import InsightForm from "@/components/InsightForm";
import type { Insight, Topic, Event } from "@/types";
import { createInsight, deleteInsight as dbDeleteInsight } from "@/lib/db";

export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [ins, ts, es] = await Promise.all([
      db.insights.orderBy("createdAt").reverse().toArray(),
      db.topics.toArray(),
      db.events.toArray(),
    ]);
    setInsights(ins);
    setTopics(ts);
    setEvents(es);
    setLoading(false);
  };

  useEffect(() => {
    async function init() { await ensureDb(); await load(); }
    init();
  }, []);

  const handleSave = async (input: { title: string; content: string; linkedEventIds: string[]; linkedTopicIds: string[] }) => {
    await createInsight(input);
    await load();
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await dbDeleteInsight(id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-serif font-semibold text-calm-900">感悟</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
            <Plus className="w-3.5 h-3.5" /> 新建感悟
          </button>
        )}
      </div>

      {showForm && (
        <InsightForm topics={topics} events={events} onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {insights.length === 0 && !showForm ? (
        <EmptyState icon={<Lightbulb className="w-16 h-16" />} title="还没有感悟" description="从日记中提炼成长感悟，或独立记录你的思考" actionLabel="新建第一条感悟" onAction={() => setShowForm(true)} />
      ) : (
        <InsightList insights={insights} topics={topics} events={events} onDeleteInsight={handleDelete} />
      )}
    </div>
  );
}
