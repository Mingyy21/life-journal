"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lightbulb, Plus, Pencil, Trash2, Settings2, Compass } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import TopicOverview from "@/components/TopicOverview";
import TopicForm from "@/components/TopicForm";
import DomainForm from "@/components/DomainForm";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { db, ensureDb, updateTopic, deleteTopicCascade, updateDomain, deleteDomainCascade, createTopic as dbCreateTopic, createDomain as dbCreateDomain } from "@/lib/db";
import type { LifeDomain, Topic } from "@/types";

export default function TopicsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<LifeDomain[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicStats, setTopicStats] = useState<Record<string, { total: number; unresolved: number; latestDate: Date | null }>>({});
  const [loading, setLoading] = useState(true);
  const [manageMode, setManageMode] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [editingDomain, setEditingDomain] = useState<LifeDomain | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "topic"; id: string; name: string } | { type: "domain"; id: string; name: string } | null>(null);

  const loadAll = async () => {
    await ensureDb();
    const [ds, ts] = await Promise.all([db.lifeDomains.toArray(), db.topics.toArray()]);
    setDomains(ds.sort((a, b) => a.order - b.order));
    setTopics(ts);

    const [diaries, events] = await Promise.all([db.diaries.toArray(), db.events.toArray()]);
    const stats: Record<string, { total: number; unresolved: number; latestDate: Date | null }> = {};
    for (const t of ts) {
      const td = diaries.filter(d => (d.topicIds || []).includes(t.id));
      const topicEvents = events.filter(e => e.topicId === t.id);
      stats[t.id] = {
        total: td.length,
        unresolved: topicEvents.filter(e => e.resolutionStatus !== "resolved" && e.resolutionStatus !== "accepted").length,
        latestDate: td.length > 0 ? td.reduce((max, d) => d.createdAt > max ? d.createdAt : max, td[0].createdAt) : null,
      };
    }
    setTopicStats(stats);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreateTopic = async (input: { name: string; domainId: string; color: string; icon: string; description: string }) => {
    await dbCreateTopic(input);
    setShowTopicForm(false);
    await loadAll();
  };

  const handleUpdateTopic = async (input: { name: string; domainId: string; color: string; icon: string; description: string }) => {
    if (!editingTopic) return;
    await updateTopic(editingTopic.id, input);
    setEditingTopic(null);
    await loadAll();
  };

  const handleDeleteTopic = async () => {
    if (!deleteTarget || deleteTarget.type !== "topic") return;
    await deleteTopicCascade(deleteTarget.id);
    setDeleteTarget(null);
    await loadAll();
  };

  const handleCreateDomain = async (input: { name: string; color: string; icon: string; description: string }) => {
    await dbCreateDomain(input);
    setShowDomainForm(false);
    await loadAll();
  };

  const handleUpdateDomain = async (input: { name: string; color: string; icon: string; description: string }) => {
    if (!editingDomain) return;
    await updateDomain(editingDomain.id, input);
    setEditingDomain(null);
    await loadAll();
  };

  const handleDeleteDomain = async () => {
    if (!deleteTarget || deleteTarget.type !== "domain") return;
    await deleteDomainCascade(deleteTarget.id);
    setDeleteTarget(null);
    await loadAll();
  };

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-serif font-semibold text-calm-900">人生课题</h1>
        <div className="flex items-center gap-2">
          <Link href="/insights" className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 transition-colors">
            <Lightbulb className="w-3.5 h-3.5" /> 感悟
          </Link>
          <button onClick={() => { setManageMode(!manageMode); setShowTopicForm(false); setShowDomainForm(false); }}
            className={`flex items-center gap-1 text-xs transition-colors ${manageMode ? "text-primary-500" : "text-calm-400 hover:text-calm-600"}`}>
            <Settings2 className="w-3.5 h-3.5" /> {manageMode ? "完成" : "管理"}
          </button>
        </div>
      </div>

      {/* 管理面板 */}
      {manageMode && (
        <div className="space-y-3">
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
                ? `删除"${deleteTarget.name}"将解除关联的日记和感悟，并删除其下所有事件。日记本身不会被删除。`
                : `删除"${deleteTarget.name}"将级联删除其下所有课题和事件。日记本身不会被删除。`}
              onConfirm={deleteTarget.type === "topic" ? handleDeleteTopic : handleDeleteDomain}
              onCancel={() => setDeleteTarget(null)}
            />
          )}

          {/* 领域和课题编辑列表 */}
          <div className="space-y-4">
            {domains.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-calm-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-medium text-calm-700">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingDomain(d); setShowDomainForm(true); setShowTopicForm(false); }}
                      className="p-2 text-calm-300 hover:text-primary-500 active:scale-95 transition-transform"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget({ type: "domain", id: d.id, name: d.name })}
                      className="p-2 text-calm-300 hover:text-red-400 active:scale-95 transition-transform"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1 ml-5">
                  {topics.filter(t => t.domainId === d.id).map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-xs text-calm-600">{t.name}</span>
                        <span className="text-xs text-calm-400">({topicStats[t.id]?.total || 0}篇)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingTopic(t); setShowTopicForm(true); setShowDomainForm(false); }}
                          className="p-2 text-calm-300 hover:text-primary-500 active:scale-95 transition-transform"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: "topic", id: t.id, name: t.name })}
                          className="p-2 text-calm-300 hover:text-red-400 active:scale-95 transition-transform"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TopicOverview domains={domains} topics={topics} topicStats={topicStats} />

      {domains.length === 0 && !loading && (
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
