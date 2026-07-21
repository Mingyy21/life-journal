"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Brain } from "lucide-react";
import type { Diary, Topic, Event } from "@/types";
import { ClientDate } from "./ClientDate";
import { EventBadge } from "./EventBadge";

interface Props {
  diaries: Diary[]; topics: Topic[]; events?: Event[]; loading?: boolean;
}

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 按日期分组，用固定格式避免 SSR/CSR 水合不一致 */
function groupByDate(diaries: Diary[]): Record<string, Diary[]> {
  const g: Record<string, Diary[]> = {};
  diaries.forEach(d => {
    const date = new Date(d.createdAt);
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAY[date.getDay()]}`;
    if (!g[key]) g[key] = [];
    g[key].push(d);
  });
  return g;
}

export default function DiaryList({ diaries, topics, events = [], loading }: Props) {
  const grouped = useMemo(() => groupByDate(diaries), [diaries]);
  const eventMap = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i=>(<div key={i} className="bg-white rounded-xl p-4 border border-calm-100 animate-pulse"><div className="h-4 bg-calm-100 rounded w-1/3 mb-2"/><div className="h-3 bg-calm-50 rounded w-2/3"/></div>))}</div>;
  }

  if (diaries.length === 0) {
    return <div className="text-center py-16"><Calendar className="w-12 h-12 text-calm-200 mx-auto mb-3"/><p className="text-calm-400 text-sm">还没有记录</p><p className="text-calm-300 text-xs mt-1">写下你的第一篇人生手记吧</p></div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, items]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-medium text-calm-400 mb-2 sticky top-14 bg-warm-50 py-1">{dateKey}</h3>
          <div className="space-y-2">
            {items.map(diary => {
              const dts = (diary.topicIds || []).map(id => topics.find(t => t.id === id)).filter(Boolean) as Topic[];
              return (
                <Link key={diary.id} href={`/diary/${diary.id}`} className="group block bg-white rounded-xl border border-calm-100 hover:border-calm-200 hover:shadow-sm transition-all p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-calm-800 truncate">{diary.title}</p>
                        {diary.hasAnalysis && <Brain className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />}
                        {diary.eventId && eventMap.has(diary.eventId) && (
                          <EventBadge eventId={diary.eventId} eventTitle="" status={eventMap.get(diary.eventId)!.resolutionStatus} linkable={false} />
                        )}
                      </div>
                      <p className="text-xs text-calm-400 line-clamp-2 leading-relaxed">{diary.content.slice(0,120)}{diary.content.length>120?"...":""}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-calm-300"><ClientDate date={diary.createdAt} format="relative" /></span>
                        {dts.slice(0,2).map(t => <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{backgroundColor:t.color+"20",color:t.color}}>{t.name}</span>)}
                        {dts.length>2 && <span className="text-xs text-calm-300">+{dts.length-2}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-calm-300 flex-shrink-0 mt-1 group-hover:text-calm-500 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
