"use client";
import type { Insight, Topic, Event } from "@/types";
import InsightCard from "./InsightCard";

interface Props {
  insights: Insight[];
  topics: Topic[];
  events: Event[];
  onDeleteInsight?: (id: string) => void;
}

export default function InsightList({ insights, topics, events, onDeleteInsight }: Props) {
  if (insights.length === 0) {
    return <p className="text-center text-calm-400 text-sm py-8">还没有感悟</p>;
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
