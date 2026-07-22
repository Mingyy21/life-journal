"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import DiaryEditor from "@/components/DiaryEditor";
import DiaryList from "@/components/DiaryList";
import DomainTopicFilter from "@/components/TagFilter";
import DateNavigator from "@/components/DateNavigator";
import DataExportImport from "@/components/DataExportImport";
import SuggestEventBanner from "@/components/SuggestEventBanner";
import PatternAlert, { type PatternAlertData } from "@/components/PatternAlert";
import { runAllPatternChecks } from "@/lib/pattern-store";
import { useDiary } from "@/hooks/useDiary";
import { useSuggestEvent } from "@/hooks/useSuggestEvent";
import { db } from "@/lib/db";
import type { Event } from "@/types";

function dayStart(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function dayEnd(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

export default function HomePage() {
  const { diaries, domains, topics, loading, ready, error: dbError, loadData, addDiary, retry } = useDiary();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [initLoaded, setInitLoaded] = useState(false);
  const [patternAlerts, setPatternAlerts] = useState<PatternAlertData[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const all = await db.events.orderBy("createdAt").reverse().toArray();
      setEvents(all);
    } catch { /* 事件加载可选，不阻塞页面 */ }
  }, []);

  const suggestion = useSuggestEvent(diaries, topics);

  const refreshWithFilter = useCallback((date: Date, topicId: string | null) => {
    loadData({
      dateFrom: dayStart(date),
      dateTo: dayEnd(date),
      topicId: topicId || undefined,
    });
  }, [loadData]);

  // 首次 ready 时加载数据 + 模式检测
  useEffect(() => {
    if (ready && !initLoaded) {
      setInitLoaded(true);
      refreshWithFilter(selectedDate, selectedTopicId);
      loadEvents();
      // 异步运行模式检测
      runAllPatternChecks().then(alerts => setPatternAlerts(alerts)).catch(() => {});
    }
  }, [ready, initLoaded, selectedDate, selectedTopicId, refreshWithFilter, loadEvents]);

  const handleDateChange = (date: Date, dateFrom: Date, dateTo: Date) => {
    setSelectedDate(date);
    loadData({ dateFrom, dateTo, topicId: selectedTopicId || undefined });
  };

  const handleTopicSelect = (id: string | null) => {
    setSelectedTopicId(id);
    if (id) {
      loadData({ topicId: id });
    } else {
      refreshWithFilter(selectedDate, null);
    }
  };

  const handleSave = async (input: { title: string; content: string; topicIds: string[]; eventId: string | null }) => {
    await addDiary(input);
    setShowEditor(false);
    refreshWithFilter(selectedDate, selectedTopicId);
    loadEvents();
  };

  const handleCreateEvent = async (input: { title: string; topicId: string }): Promise<Event | null> => {
    const event = await db.events.add({
      id: crypto.randomUUID(),
      topicId: input.topicId,
      title: input.title,
      description: "",
      resolutionStatus: "unresolved",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await loadEvents();
    const created = await db.events.get(event as string);
    return created || null;
  };

  return (
    <div className="space-y-5">
      {/* 数据库错误 — 小横幅，不阻断页面 */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-red-500 truncate">数据库初始化失败：{dbError}</p>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={retry} className="px-3 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">重试</button>
            <button onClick={async () => { await db.delete(); window.location.reload(); }} className="px-3 py-1 text-xs font-medium rounded-lg bg-white text-red-400 hover:bg-red-100 transition-colors">重置</button>
          </div>
        </div>
      )}

      <PatternAlert alerts={patternAlerts} onDismiss={(idx) => setPatternAlerts(prev => prev.filter((_, i) => i !== idx))} />
      <DateNavigator selectedDate={selectedDate} onChange={handleDateChange} />

      {!showEditor ? (
        <button onClick={() => setShowEditor(true)} className="w-full bg-white rounded-2xl border-2 border-dashed border-calm-200 p-6 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all group">
          <Plus className="w-8 h-8 text-calm-300 mx-auto mb-2 group-hover:text-primary-400 transition-colors" />
          <p className="text-calm-400 text-sm group-hover:text-primary-500 transition-colors">记录今天的想法...</p>
        </button>
      ) : (
        <DiaryEditor domains={domains} topics={topics} events={events} onSave={handleSave} onCreateEvent={handleCreateEvent} onCancel={() => setShowEditor(false)} />
      )}

      {suggestion && !bannerDismissed && !showEditor && (
        <SuggestEventBanner
          topicName={suggestion.topicName}
          topicColor={suggestion.topicColor}
          count={suggestion.count}
          earliestDate={suggestion.earliestDate}
          latestDate={suggestion.latestDate}
          onCreateEvent={() => setShowEditor(true)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <DomainTopicFilter domains={domains} topics={topics} selectedTopicId={selectedTopicId} onTopicSelect={handleTopicSelect} />
      <DiaryList diaries={diaries} topics={topics} events={events} loading={loading || !initLoaded} />
      <DataExportImport />
    </div>
  );
}
