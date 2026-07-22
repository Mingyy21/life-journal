"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lightbulb, Plus, Settings2, Compass } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import TopicOverview from "@/components/TopicOverview";
import TopicForm from "@/components/TopicForm";
import DomainForm from "@/components/DomainForm";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useInit } from "@/components/InitProvider";
import { useTopics, useDomains, useAllDiaries, useEvents } from "@/hooks/useData";
import { db, updateTopic, deleteTopicCascade, updateDomain, deleteDomainCascade, createTopic as dbCreateTopic, createDomain as dbCreateDomain } from "@/lib/db";
import type { LifeDomain, Topic } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useData";

export default function TopicsPage() {
  const router = useRouter();
  const { ready } = useInit();
  const qc = useQueryClient();

  const { data: domains = [], isLoading: domainsLoading } = useDomains();
  const { data: topics = [] } = useTopics();
  const { data: allDiaries = [] } = useAllDiaries();
  const { data: allEvents = [] } = useEvents();

  const [manageMode, setManageMode] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [editingDomain, setEditingDomain] = useState<LifeDomain | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "topic"; id: string; name: string } | { type: "domain"; id: string; name: string } | null>(null);

  const topicStats = useMemo(() => {
    const stats: Record<string, { total: number; unresolved: number; latestDate: Date | null }> = {};
    for (const t of topics) {
      const td = allDiaries.filter(d => (d.topicIds || []).includes(t.id));
      const topicEvents = allEvents.filter(e => e.topicId === t.id);
      stats[t.id] = {
        total: td.length,
        unresolved: topicEvents.filter(e => e.resolutionStatus !== "resolved" && e.resolutionStatus !== "accepted").length,
        latestDate: td.length > 0 ? td.reduce((max, d) => d.createdAt > max ? d.createdAt : max, td[0].createdAt) : null,
      };
    }
    return stats;
  }, [topics, allDiaries, allEvents]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.topics });
    qc.invalidateQueries({ queryKey: queryKeys.domains });
    qc.invalidateQueries({ queryKey: queryKeys.diaries() });
    qc.invalidateQueries({ queryKey: queryKeys.events });
  };

  const handleCreateTopic = async (input: { name: string; domainId: string; color: string; icon: string; description: string }) => {
    await dbCreateTopic(input);
    setShowTopicForm(false);
    invalidate();
  };

  const handleUpdateTopic = async (input: { name: string; domainId: string; color: string; icon: string; description: string }) => {
    if (!editingTopic) return;
    await updateTopic(editingTopic.id, input);
    setEditingTopic(null);
    invalidate();
  };

  const handleDeleteTopic = async () => {
    if (!deleteTarget || deleteTarget.type !== "topic") return;
    await deleteTopicCascade(deleteTarget.id);
    setDeleteTarget(null);
    invalidate();
  };

  const handleCreateDomain = async (input: { name: string; color: string; icon: string; description: string }) => {
    await dbCreateDomain(input);
    setShowDomainForm(false);
    invalidate();
  };

  const handleUpdateDomain = async (input: { name: string; color: string; icon: string; description: string }) => {
    if (!editingDomain) return;
    await updateDomain(editingDomain.id, input);
    setEditingDomain(null);
    invalidate();
  };

  const handleDeleteDomain = async () => {
    if (!deleteTarget || deleteTarget.type !== "domain") return;
    await deleteDomainCascade(deleteTarget.id);
    setDeleteTarget(null);
    invalidate();
  };

  if (!ready && domainsLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary-300 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-serif font-semibold text-calm-900">人生课题</h1>
        <div className="flex items-center gap-2">
          <Link href="/insights" className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 transition-colors">
            <Lightbulb className="w-3.5 h-3.5" /> 感悟
          </Link>
          <button onClick={() => { setManageMode(!manageMode); setShowTopicForm(false); setShowDomainForm(false); setEditingTopic(null); setEditingDomain(null); setDeleteTarget(null); }}
            className={`flex items-center gap-1 text-xs transition-colors ${manageMode ? "text-primary-500" : "text-calm-400 hover:text-calm-600"}`}>
            <Settings2 className="w-3.5 h-3.5" /> {manageMode ? "完成" : "管理"}
          </button>
        </div>
      </div>

      {manageMode && (
        <div className="flex gap-2">
          <button onClick={() => { setShowTopicForm(true); setEditingTopic(null); setShowDomainForm(false); setEditingDomain(null); }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors">
            <Plus className="w-3.5 h-3.5" /> 新建课题
          </button>
          <button onClick={() => { setShowDomainForm(true); setEditingDomain(null); setShowTopicForm(false); setEditingTopic(null); }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors">
            <Plus className="w-3.5 h-3.5" /> 新建领域
          </button>
        </div>
      )}

      {showTopicForm && (
        <TopicForm domains={domains} initialValues={editingTopic} onSave={editingTopic ? handleUpdateTopic : handleCreateTopic}
          onCancel={() => { setShowTopicForm(false); setEditingTopic(null); }} />
      )}
      {showDomainForm && (
        <DomainForm initialValues={editingDomain} onSave={editingDomain ? handleUpdateDomain : handleCreateDomain}
          onCancel={() => { setShowDomainForm(false); setEditingDomain(null); }} />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`删除${deleteTarget.type === "topic" ? "课题" : "领域"}`}
          message={deleteTarget.type === "topic"
            ? `删除"${deleteTarget.name}"将解除关联的日记和感悟，并移除其下所有事件。日记本身不会被删除。`
            : `删除"${deleteTarget.name}"将级联删除其下所有课题和事件。日记本身不会被删除。`}
          onConfirm={deleteTarget.type === "topic" ? handleDeleteTopic : handleDeleteDomain}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <TopicOverview
        domains={domains} topics={topics} topicStats={topicStats}
        manageMode={manageMode}
        onEditTopic={(topic) => { setEditingTopic(topic); setShowTopicForm(true); setShowDomainForm(false); }}
        onDeleteTopic={(id, name) => setDeleteTarget({ type: "topic", id, name })}
        onEditDomain={(domain) => { setEditingDomain(domain); setShowDomainForm(true); setShowTopicForm(false); }}
        onDeleteDomain={(id, name) => setDeleteTarget({ type: "domain", id, name })}
      />

      {domains.length === 0 && !domainsLoading && (
        <EmptyState
          icon={<Compass className="w-16 h-16" />}
          title="还没有领域"
          description="创建一个领域来组织你的人生课题"
          actionLabel="创建第一个领域"
          onAction={() => { setShowDomainForm(true); setManageMode(true); }}
        />
      )}
    </div>
  );
}
