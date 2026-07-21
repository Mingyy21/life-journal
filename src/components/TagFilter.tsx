"use client";
import { useState } from "react";
import { Filter, ChevronDown, ChevronRight } from "lucide-react";
import type { LifeDomain, Topic } from "@/types";

interface Props {
  domains: LifeDomain[];
  topics: Topic[];
  selectedTopicId: string | null;
  onTopicSelect: (id: string | null) => void;
}

export default function DomainTopicFilter({ domains, topics, selectedTopicId, onTopicSelect }: Props) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const safeDomains = domains || [];
  const safeTopics = topics || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-calm-400"><Filter className="w-3.5 h-3.5" /> 筛选</div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <button onClick={() => { onTopicSelect(null); setExpandedDomain(null); }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${!selectedTopicId ? "bg-calm-800 text-white" : "bg-calm-100 text-calm-500 hover:bg-calm-200"}`}>全部</button>
        {safeDomains.map(d => {
          const subs = safeTopics.filter(t => t.domainId === d.id);
          const isExpanded = expandedDomain === d.id;
          return (
            <div key={d.id} className="relative">
              <button onClick={() => setExpandedDomain(isExpanded ? null : d.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all bg-calm-100 text-calm-500 hover:bg-calm-200"
                style={{ color: d.color }}>
                {d.name}
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isExpanded && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-calm-100 p-2 z-20 min-w-[120px]">
                  {subs.map(t => (
                    <button key={t.id}
                      onClick={() => { onTopicSelect(t.id === selectedTopicId ? null : t.id); setExpandedDomain(null); }}
                      className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedTopicId === t.id ? "text-white" : "text-calm-500 hover:bg-calm-50"
                      }`}
                      style={selectedTopicId === t.id ? { backgroundColor: t.color } : {}}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
