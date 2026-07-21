"use client";
import Link from "next/link";
import { ChevronRight, Brain, BookOpen } from "lucide-react";
import EmptyState from "./EmptyState";
import type { Diary, Topic } from "@/types";
import { ClientDate } from "./ClientDate";

interface Props {
  diaries: Diary[];
  topics: Topic[];
}

export default function EventTimeline({ diaries, topics }: Props) {
  const topicMap = new Map(topics.map(t => [t.id, t]));
  const sorted = [...diaries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={<BookOpen className="w-12 h-12" />} title="还没有关联的日记" description="将日记关联到这个事件后会在这里展示" />;
  }

  return (
    <div className="relative pl-5 border-l-2 border-calm-100 space-y-4">
      {sorted.map((diary, idx) => {
        const dts = (diary.topicIds || []).map(id => topicMap.get(id)).filter(Boolean) as Topic[];
        return (
          <div key={diary.id} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="absolute left-[-29px] top-2 w-3 h-3 rounded-full border-2 border-calm-200 bg-white" />
            <Link href={`/diary/${diary.id}`}
              className="block bg-white rounded-xl border border-calm-100 hover:border-calm-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 p-4 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-calm-800 truncate">{diary.title}</p>
                    {diary.hasAnalysis && <Brain className="w-3 h-3 text-primary-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-calm-400 line-clamp-2 leading-relaxed">{diary.content.slice(0, 120)}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-calm-300"><ClientDate date={diary.createdAt} format="relative" /></span>
                    {dts.map(t => (
                      <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + "20", color: t.color }}>{t.name}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-calm-300 flex-shrink-0 group-hover:text-calm-500 transition-colors" />
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
