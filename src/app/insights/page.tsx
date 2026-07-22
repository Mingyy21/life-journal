"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Lightbulb } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import InsightList from "@/components/InsightList";
import InsightForm from "@/components/InsightForm";
import { useInsights, useTopics, useEvents, useCreateInsight, useDeleteInsight } from "@/hooks/useData";

export default function InsightsPage() {
  const router = useRouter();
  const { data: insights = [], isLoading } = useInsights();
  const { data: topics = [] } = useTopics();
  const { data: events = [] } = useEvents();
  const createInsightMutation = useCreateInsight();
  const deleteInsightMutation = useDeleteInsight();
  const [showForm, setShowForm] = useState(false);

  const handleSave = async (input: { title: string; content: string; linkedEventIds: string[]; linkedTopicIds: string[] }) => {
    await createInsightMutation.mutateAsync(input);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteInsightMutation.mutateAsync(id);
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
