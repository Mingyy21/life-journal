"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Link2, Undo2, ChevronRight, ArrowLeftRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, createRelation, deleteRelation, getRelationsForInsight } from "@/lib/db";
import { useInit } from "@/components/InitProvider";
import type { Insight, InsightRelation, RelationType } from "@/types";

interface Props {
  insightId: string;
}

const RELATION_LABEL: Record<RelationType, string> = {
  parent: "上级",
  child: "下级",
  sibling: "平级",
  opposite: "反面",
};

const RELATION_ICON: Record<RelationType, string> = {
  parent: "⬆",
  child: "⬇",
  sibling: "↔",
  opposite: "⚡",
};

function UndoToast({ message, onUndo, onExpire }: { message: string; onUndo: () => void; onExpire: () => void }) {
  useEffect(() => {
    const t = setTimeout(onExpire, 3000);
    return () => clearTimeout(t);
  }, [onExpire]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-calm-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-xs animate-slide-up">
      <span>{message}</span>
      <button onClick={onUndo} className="font-medium text-primary-300 hover:text-primary-200 flex items-center gap-1">
        <Undo2 className="w-3 h-3" /> 撤销
      </button>
    </div>
  );
}

export default function InsightRelationSection({ insightId }: Props) {
  const { ready } = useInit();
  const qc = useQueryClient();
  const [showSelector, setShowSelector] = useState(false);
  const [toast, setToast] = useState<{ message: string; relId: string } | null>(null);

  const { data: relations = [] } = useQuery({
    queryKey: ["insight-relations", insightId],
    queryFn: () => getRelationsForInsight(insightId),
    enabled: ready,
  });

  const { data: allInsights = [] } = useQuery({
    queryKey: ["insights-all"],
    queryFn: () => db.insights.toArray(),
    staleTime: 30_000,
    enabled: ready && showSelector,
  });

  const handleCreate = async (targetId: string, type: RelationType) => {
    try {
      const rel = await createRelation({ sourceId: insightId, targetId, relationType: type });
      const target = allInsights.find(i => i.id === targetId);
      setToast({ message: `已链接 → ${RELATION_LABEL[type]} → ${target?.title || "未知"}`, relId: rel.id });
      qc.invalidateQueries({ queryKey: ["insight-relations", insightId] });
      setShowSelector(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUndo = async () => {
    if (!toast) return;
    await deleteRelation(toast.relId);
    setToast(null);
    qc.invalidateQueries({ queryKey: ["insight-relations", insightId] });
  };

  const handleDelete = async (relId: string) => {
    await deleteRelation(relId);
    qc.invalidateQueries({ queryKey: ["insight-relations", insightId] });
  };

  const availableInsights = allInsights.filter(i => i.id !== insightId);

  // 按关系类型分组
  const grouped = { parent: [] as InsightRelation[], child: [] as InsightRelation[], sibling: [] as InsightRelation[], opposite: [] as InsightRelation[] };
  for (const r of relations) {
    if (grouped[r.relationType]) grouped[r.relationType].push(r);
  }

  return (
    <div className="bg-white rounded-2xl border border-calm-200 p-5 mt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-serif font-semibold text-calm-900 flex items-center gap-1.5">
          <Link2 className="w-4 h-4" /> 关联关系
        </h3>
        <button onClick={() => setShowSelector(true)}
          className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600">
          <Plus className="w-3 h-3" /> 添加关联
        </button>
      </div>

      {relations.length === 0 && !showSelector && (
        <p className="text-xs text-calm-400">暂无关联，点击上方按钮链接其他感悟</p>
      )}

      {(["parent", "child", "sibling", "opposite"] as RelationType[]).map(type => {
        const items = grouped[type];
        if (items.length === 0) return null;
        const targetIds = items.map(r => r.targetId);
        const targets = targetIds.map(id => allInsights.find(i => i.id === id)).filter(Boolean) as Insight[];
        if (targets.length === 0) return null;

        return (
          <div key={type} className="mb-2 last:mb-0">
            <p className="text-xs text-calm-400 mb-1">{RELATION_LABEL[type]} {RELATION_ICON[type]}</p>
            <div className="space-y-1">
              {targets.map((t, i) => (
                <div key={items[i].id} className="flex items-center justify-between bg-calm-50 rounded-lg px-3 py-2 group">
                  <a href={`/insights/${t.id}`} className="text-sm text-calm-700 hover:text-primary-600 truncate flex-1">
                    {t.title}
                  </a>
                  <button onClick={() => handleDelete(items[i].id)}
                    className="opacity-0 group-hover:opacity-100 text-calm-300 hover:text-red-400 transition-all p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 选择器弹窗 */}
      {showSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-popup w-full max-w-sm max-h-[80vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-calm-100">
              <h4 className="text-sm font-serif font-semibold text-calm-900">链接到其他感悟</h4>
              <button onClick={() => setShowSelector(false)} className="p-1 rounded-lg hover:bg-calm-100 text-calm-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {availableInsights.map(ai => (
                <RelationItem key={ai.id} insight={ai} onSelect={(type) => handleCreate(ai.id, type)} />
              ))}
              {availableInsights.length === 0 && (
                <p className="text-xs text-calm-400 p-4 text-center">没有其他感悟可链接</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 撤销 Toast */}
      {toast && <UndoToast message={toast.message} onUndo={handleUndo} onExpire={() => setToast(null)} />}
    </div>
  );
}

function RelationItem({ insight, onSelect }: { insight: Insight; onSelect: (type: RelationType) => void }) {
  const [showTypes, setShowTypes] = useState(false);
  const types: RelationType[] = ["parent", "child", "sibling", "opposite"];

  return (
    <div className="px-2 py-1.5 rounded-lg hover:bg-calm-50 cursor-pointer" onClick={() => setShowTypes(!showTypes)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-calm-700 truncate flex-1">{insight.title}</span>
        <ChevronRight className={`w-3.5 h-3.5 text-calm-400 transition-transform ${showTypes ? "rotate-90" : ""}`} />
      </div>
      {showTypes && (
        <div className="flex items-center gap-1.5 mt-1 mb-1 ml-4">
          {types.map(type => (
            <button
              key={type}
              onClick={e => { e.stopPropagation(); onSelect(type); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                type === "parent" ? "bg-blue-50 text-blue-600 hover:bg-blue-100" :
                type === "child" ? "bg-green-50 text-green-600 hover:bg-green-100" :
                type === "sibling" ? "bg-amber-50 text-amber-600 hover:bg-amber-100" :
                "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              {RELATION_LABEL[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
