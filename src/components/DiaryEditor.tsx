"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Save, X } from "lucide-react";
import DomainTopicSelector from "./DomainTopicSelector";
import EventSelector from "./EventSelector";
import type { LifeDomain, Topic, Event } from "@/types";

const DRAFT_KEY = "diary_draft";

interface Draft {
  title: string;
  content: string;
  topicIds: string[];
  eventId: string | null;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d.content) return null;
    return d;
  } catch { return null; }
}

function saveDraft(draft: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

interface Props {
  domains: LifeDomain[];
  topics: Topic[];
  events: Event[];
  initialValues?: { title: string; content: string; topicIds: string[]; eventId: string | null } | null;
  onSave: (input: { title: string; content: string; topicIds: string[]; eventId: string | null }) => Promise<void>;
  onCreateEvent: (input: { title: string; topicId: string }) => Promise<Event | null>;
  onCancel: () => void;
}

export default function DiaryEditor({ domains, topics, events, initialValues, onSave, onCreateEvent, onCancel }: Props) {
  const isEditing = !!initialValues;
  const draft = isEditing ? null : loadDraft();
  const [title, setTitle] = useState(initialValues?.title || draft?.title || "");
  const [content, setContent] = useState(initialValues?.content || draft?.content || "");
  const [topicIds, setTopicIds] = useState<string[]>(initialValues?.topicIds || draft?.topicIds || []);
  const [eventId, setEventId] = useState<string | null>(initialValues?.eventId ?? draft?.eventId ?? null);
  const [saving, setSaving] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const diff = window.innerHeight - vv.height;
      setKeyboardOpen(diff > 100);
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
  }, []);

  const debouncedSave = useCallback((draft: Draft) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveDraft(draft), 800);
  }, []);

  useEffect(() => {
    if (!isEditing && content.trim()) {
      debouncedSave({ title, content, topicIds, eventId });
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isEditing, title, content, topicIds, eventId, debouncedSave]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim() || "无标题", content: content.trim(), topicIds, eventId });
      setTitle(""); setContent(""); setTopicIds([]); setEventId(null);
      clearDraft();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-calm-200 p-5 animate-slide-up pb-20 md:pb-5">
      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="给今天的记录起个标题..." className="w-full text-lg font-serif font-medium text-calm-900 placeholder-calm-300 border-none outline-none bg-transparent mb-3" />
      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder="今天发生了什么？你的感受是什么？" rows={6}
        className="w-full text-base text-calm-700 placeholder-calm-300 border-none outline-none bg-transparent resize-none leading-relaxed" />

      <div className="border-t border-calm-100 pt-3 mt-2">
        <DomainTopicSelector domains={domains} topics={topics} selectedTopicIds={topicIds} onChange={setTopicIds} />
      </div>

      <div className="pt-3">
        <p className="text-xs text-calm-400 mb-2">关联事件</p>
        <EventSelector
          events={events}
          topics={topics}
          selectedEventId={eventId}
          onChange={setEventId}
          onCreateEvent={onCreateEvent}
        />
      </div>

      <div className={`flex items-center justify-between pt-4 mt-2 border-t border-calm-100 bg-white ${keyboardOpen ? "static" : "md:static fixed bottom-0 left-0 right-0"} border-t border-calm-200 px-4 py-3 md:px-0 md:py-0 md:border-t-0 md:border-0 z-50 md:z-30`} style={{ paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}>
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-2.5 text-sm text-calm-400 hover:text-calm-600 active:scale-95 transition-transform"><X className="w-4 h-4" /> 取消</button>
        <button onClick={handleSave} disabled={!content.trim() || saving}
          className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          {saving ? <span className="animate-pulse-soft">保存中...</span> : <><Save className="w-4 h-4" /> {isEditing ? "保存修改" : "保存"}</>}
        </button>
      </div>
    </div>
  );
}
