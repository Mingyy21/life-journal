"use client";
import Link from "next/link";
import { ChevronRight, Brain, BookOpen } from "lucide-react";
import EmptyState from "./EmptyState";
import type { Diary, Topic, Event } from "@/types";
import { ClientDate } from "./ClientDate";
import { EventBadge } from "./EventBadge";

interface Props {
  diaries: Diary[];
  topics: Topic[];
  events?: Event[];
}

export default function TopicDiaryList({ diaries, topics, events = [] }: Props) {
  const eventMap = new Map(events.map(e => [e.id, e]));

  if (diaries.length === 0) {
    return <EmptyState icon={<BookOpen className="w-12 h-12" />} title="该课题下还没有日记记录" description="记录与该课题相关的日记" actionLabel="写一篇日记" actionHref="/" />;
  }

  return (
    <div className="space-y-2">
      {diaries.map((diary, idx) => {
        const dts = diary.topicIds.map(id => topics.find(t => t.id === id)).filter(Boolean) as Topic[];
        const linkedEvent = diary.eventId ? eventMap.get(diary.eventId) : null;
        return (
          <Link key={diary.id} href={`/diary/${diary.id}`}
            className="flex items-start justify-between gap-3 bg-white rounded-xl border border-calm-100 hover:border-calm-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 p-4 group animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-medium text-calm-800">{diary.title}</p>
                {diary.hasAnalysis && <Brain className="w-3.5 h-3.5 text-primary-400" />}
                {linkedEvent && (
                  <EventBadge eventId={linkedEvent.id} eventTitle="" status={linkedEvent.resolutionStatus} linkable={false} />
                )}
                {!diary.eventId && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-calm-50 text-calm-400">日常</span>
                )}
              </div>
              <p className="text-xs text-calm-400 line-clamp-2">{diary.content.slice(0, 120)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-calm-300"><ClientDate date={diary.createdAt} format="relative" /></span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-calm-300 flex-shrink-0 mt-1 group-hover:text-calm-500" />
          </Link>
        );
      })}
    </div>
  );
}
