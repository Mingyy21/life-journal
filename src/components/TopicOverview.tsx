"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LifeDomain, Topic } from "@/types";
import { ResolutionBadge } from "./ResolutionBadge";

interface Props {
  domains: LifeDomain[];
  topics: Topic[];
  topicStats: Record<string, { total: number; unresolved: number; latestDate: Date | null }>;
}

export default function TopicOverview({ domains, topics, topicStats }: Props) {
  const safeDomains = domains || [];
  const safeTopics = topics || [];
  return (
    <div className="space-y-4">
      {safeDomains.map(d => {
        const subs = safeTopics.filter(t => t.domainId === d.id);
        if (subs.length === 0) return null;
        return (
          <div key={d.id}>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: d.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </h3>
            <div className="space-y-1.5">
              {subs.map(t => {
                const stats = topicStats[t.id] || { total: 0, unresolved: 0, latestDate: null };
                return (
                  <Link key={t.id} href={`/topics/${t.id}`}
                    className="flex items-center justify-between bg-white rounded-xl border border-calm-100 hover:border-calm-200 hover:shadow-sm transition-all p-3.5 group">
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
