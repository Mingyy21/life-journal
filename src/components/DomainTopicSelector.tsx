"use client";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LifeDomain, Topic } from "@/types";

interface Props {
  domains: LifeDomain[];
  topics: Topic[];
  selectedTopicIds: string[];
  onChange: (topicIds: string[]) => void;
}

export default function DomainTopicSelector({ domains, topics, selectedTopicIds, onChange }: Props) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const safeDomains = domains || [];
  const safeTopics = topics || [];

  const domainTopics = useMemo(() => {
    const map: Record<string, Topic[]> = {};
    for (const d of safeDomains) map[d.id] = safeTopics.filter(t => t.domainId === d.id);
    return map;
  }, [safeDomains, safeTopics]);

  const toggleTopic = (topicId: string) => {
    if (selectedTopicIds.includes(topicId)) {
      onChange(selectedTopicIds.filter(id => id !== topicId));
    } else {
      onChange([...selectedTopicIds, topicId]);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-calm-400">选择课题</p>
      <div className="space-y-1.5">
        {safeDomains.map(d => {
          const isExpanded = expandedDomain === d.id;
          const subs = domainTopics[d.id] || [];
          const selectedInDomain = subs.filter(t => selectedTopicIds.includes(t.id));
          return (
            <div key={d.id}>
              <button
                onClick={() => setExpandedDomain(isExpanded ? null : d.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: isExpanded ? d.color + "18" : "#F8FAFC",
                  color: d.color,
                  border: isExpanded ? `1px solid ${d.color}40` : "1px solid #E2E8F0",
                }}
              >
                <span className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {d.name}
                </span>
                {selectedInDomain.length > 0 && !isExpanded && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: d.color }}>
                    {selectedInDomain.length}
                  </span>
                )}
              </button>
              {isExpanded && subs.length > 0 && (
                <div className="ml-5 mt-1 flex flex-wrap gap-1.5">
                  {subs.map(t => {
                    const selected = selectedTopicIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTopic(t.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: selected ? t.color : "#F1F5F9",
                          color: selected ? "#fff" : "#64748B",
                          border: selected ? "none" : "1px solid #E2E8F0",
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
