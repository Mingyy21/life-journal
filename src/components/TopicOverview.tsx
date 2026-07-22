"use client";
import Link from "next/link";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { LifeDomain, Topic } from "@/types";

interface Props {
  domains: LifeDomain[];
  topics: Topic[];
  topicStats: Record<string, { total: number; unresolved: number; latestDate: Date | null }>;
  manageMode?: boolean;
  onEditTopic?: (topic: Topic) => void;
  onDeleteTopic?: (id: string, name: string) => void;
  onEditDomain?: (domain: LifeDomain) => void;
  onDeleteDomain?: (id: string, name: string) => void;
}

export default function TopicOverview({ domains, topics, topicStats, manageMode, onEditTopic, onDeleteTopic, onEditDomain, onDeleteDomain }: Props) {
  const safeDomains = domains || [];
  const safeTopics = topics || [];
  return (
    <div className="space-y-4">
      {safeDomains.map(d => {
        const subs = safeTopics.filter(t => t.domainId === d.id);
        if (subs.length === 0 && !manageMode) return null;
        return (
          <div key={d.id}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: d.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
                {subs.length === 0 && <span className="text-[10px] text-calm-400 ml-1">（无课题）</span>}
              </h3>
              {manageMode && (
                <div className="flex items-center gap-1">
                  {onEditDomain && (
                    <button onClick={() => onEditDomain(d)} className="p-1.5 rounded-lg text-calm-300 hover:text-primary-500 hover:bg-calm-50 transition-colors" title="编辑领域">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteDomain && (
                    <button onClick={() => onDeleteDomain(d.id, d.name)} className="p-1.5 rounded-lg text-calm-300 hover:text-red-400 hover:bg-red-50 transition-colors" title="删除领域">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {subs.length === 0 && !manageMode && (
                <p className="text-xs text-calm-300 ml-5 py-1">暂无课题</p>
              )}
              {subs.map(t => {
                const stats = topicStats[t.id] || { total: 0, unresolved: 0, latestDate: null };
                return (
                  <div key={t.id} className="group relative">
                    <Link href={`/topics/${t.id}`}
                      className={`flex items-center justify-between bg-white rounded-xl border ${manageMode ? 'border-dashed border-calm-200' : 'border-calm-100 hover:border-calm-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5'} transition-all duration-300 p-4`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: t.color }}>
                          {t.name[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-calm-800">{t.name}</p>
                          <p className="text-xs text-calm-400 truncate">{t.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-calm-700">{stats.total}</p>
                          {stats.unresolved > 0 && (
                            <p className="text-xs text-orange-500">{stats.unresolved} 未解决</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-calm-300 group-hover:text-calm-500 transition-colors" />
                      </div>
                    </Link>
                    {manageMode && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditTopic && (
                          <button onClick={(e) => { e.preventDefault(); onEditTopic(t); }} className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-calm-400 hover:text-primary-500 hover:bg-white shadow-sm border border-calm-100 transition-colors" title="编辑课题">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTopic && (
                          <button onClick={(e) => { e.preventDefault(); onDeleteTopic(t.id, t.name); }} className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-calm-400 hover:text-red-400 hover:bg-white shadow-sm border border-calm-100 transition-colors" title="删除课题">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
