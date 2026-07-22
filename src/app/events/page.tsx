"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import EventCard from "@/components/EventCard";
import { useEvents, useAllDiaries } from "@/hooks/useData";
import type { Event } from "@/types";

type StatusGroup = { status: string; label: string; events: { event: Event; diaryCount: number }[] };

export default function EventsPage() {
  const router = useRouter();
  const { data: events } = useEvents();
  const { data: diaries } = useAllDiaries();

  const groups = useMemo<StatusGroup[]>(() => {
    if (!events || !diaries) return [];

    const diaryCountMap = new Map<string, number>();
    diaries.forEach(d => {
      if (d.eventId) diaryCountMap.set(d.eventId, (diaryCountMap.get(d.eventId) || 0) + 1);
    });

    const statusOrder = [
      { key: "unresolved", label: "未解决" },
      { key: "in_progress", label: "解决中" },
      { key: "avoiding", label: "逃避中" },
      { key: "accepted", label: "已接纳" },
      { key: "resolved", label: "已解决" },
    ];

    return statusOrder.map(({ key, label }) => ({
      status: key,
      label,
      events: events
        .filter(e => e.resolutionStatus === key)
        .map(e => ({ event: e, diaryCount: diaryCountMap.get(e.id) || 0 })),
    })).filter(g => g.events.length > 0);
  }, [events, diaries]);

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>
      <h1 className="text-lg font-serif font-semibold text-calm-900">事件总览</h1>

      {groups.length === 0 ? (
        <EmptyState icon={<AlertCircle className="w-16 h-16" />} title="还没有事件" description="将日记升级为事件，开始追踪你的成长" actionLabel="去写日记" actionHref="/" />
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.status}>
              <h2 className="text-sm font-medium text-calm-500 mb-2">{g.label} ({g.events.length})</h2>
              <div className="space-y-2">
                {g.events.map(({ event, diaryCount }) => (
                  <EventCard key={event.id} event={event} diaryCount={diaryCount} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
