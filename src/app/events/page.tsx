"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { db, ensureDb } from "@/lib/db";
import EventCard from "@/components/EventCard";
import type { Event, Topic } from "@/types";

type StatusGroup = { status: string; label: string; events: { event: Event; diaryCount: number }[] };

export default function EventsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await ensureDb();
      const [events, diaries] = await Promise.all([db.events.orderBy("createdAt").reverse().toArray(), db.diaries.toArray()]);

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

      const grouped = statusOrder.map(({ key, label }) => ({
        status: key,
        label,
        events: events
          .filter(e => e.resolutionStatus === key)
          .map(e => ({ event: e, diaryCount: diaryCountMap.get(e.id) || 0 })),
      })).filter(g => g.events.length > 0);

      setGroups(grouped);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>
      <h1 className="text-lg font-serif font-semibold text-calm-900">事件总览</h1>

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-calm-200 mx-auto mb-3" />
          <p className="text-calm-400 text-sm">还没有事件</p>
          <p className="text-calm-300 text-xs mt-1">将日记升级为事件，开始追踪你的成长</p>
        </div>
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
