"use client";
import type { Insight, Topic, Event } from "@/types";
import InsightCard from "./InsightCard";
import { Lightbulb } from "lucide-react";
import EmptyState from "./EmptyState";

interface Props {
  insights: Insight[];
  topics: Topic[];
  events: Event[];
  onDeleteInsight?: (id: string) => void;
}

export default function InsightList({ insights, topics, events, onDeleteInsight }: Props) {
  if (insights.length === 0) {
    return <EmptyState icon={<Lightbulb className="w-12 h-12" />} title="还没有感悟" description="在日记详情页可以提炼感悟" />;
  }

  return (
    <div className="space-y-2">
      {insights.map(insight => (
        <InsightCard
          key={insight.id}
          insight={insight}
          topics={topics}
          events={events}
          onDelete={onDeleteInsight ? () => onDeleteInsight(insight.id) : undefined}
        />
      ))}
    </div>
  );
}
