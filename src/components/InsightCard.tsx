"use client";
import Link from "next/link";
import { Lightbulb, Trash2 } from "lucide-react";
import type { Insight, Topic, Event } from "@/types";
import { ClientDate } from "./ClientDate";

interface Props {
  insight: Insight;
  topics: Topic[];
  events: Event[];
  onDelete?: () => void;
}

export default function InsightCard({ insight, topics, events, onDelete }: Props) {
  const topicMap = new Map(topics.map(t => [t.id, t]));
  const eventMap = new Map(events.map(e => [e.id, e]));

  return (
    <div className="bg-white rounded-xl border border-calm-100 hover:border-amber-200 hover:shadow-sm transition-all p-4 group">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link href={`/insights/${insight.id}`} className="text-sm font-medium text-calm-800 hover:text-primary-600 transition-colors line-clamp-1">
              {insight.title}
            </Link>
            {onDelete && (
              <button onClick={onDelete} className="text-calm-300 hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-calm-500 line-clamp-3 leading-relaxed mb-2">{insight.content}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-calm-300"><ClientDate date={insight.createdAt} format="relative" /></span>
            {insight.linkedTopicIds.map(tid => {
              const t = topicMap.get(tid);
              if (!t) return null;
              return <span key={tid} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + "20", color: t.color }}>{t.name}</span>;
            })}
            {insight.linkedEventIds.map(eid => {
              const ev = eventMap.get(eid);
              if (!ev) return null;
              return (
                <Link key={eid} href={`/events/${eid}`}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-calm-50 text-calm-500 hover:bg-calm-100 transition-colors">
                  {ev.title}
                </Link>
              );
            })}
            {insight.sourceDiaryId && (
              <Link href={`/diary/${insight.sourceDiaryId}`}
                className="text-xs text-calm-400 hover:text-primary-500 underline">
                来源日记
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
