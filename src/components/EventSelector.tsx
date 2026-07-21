"use client";
import { useState, useMemo } from "react";
import { Search, Plus, Link2 } from "lucide-react";
import type { Topic, Event } from "@/types";

interface Props {
  events: Event[];
  topics: Topic[];
  selectedEventId: string | null;
  onChange: (eventId: string | null) => void;
  onCreateEvent: (input: { title: string; topicId: string }) => Promise<Event | null>;
}

export default function EventSelector({ events, topics, selectedEventId, onChange, onCreateEvent }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTopicId, setNewTopicId] = useState(topics[0]?.id || "");
  const [creating, setCreating] = useState(false);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const filtered = useMemo(() => {
    if (!search.trim()) return events.slice(0, 10);
    const kw = search.toLowerCase();
    return events.filter(e => e.title.toLowerCase().includes(kw)).slice(0, 10);
  }, [events, search]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newTopicId) return;
    setCreating(true);
    const ev = await onCreateEvent({ title: newTitle.trim(), topicId: newTopicId });
    setCreating(false);
    if (ev) {
      onChange(ev.id);
      setShowNewForm(false);
      setNewTitle("");
      setOpen(false);
    }
  };

  const statusLabel: Record<string, string> = { unresolved: "未解决", in_progress: "解决中", avoiding: "逃避中", accepted: "已接纳", resolved: "已解决" };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-sm border border-calm-200 rounded-lg px-3 py-2 text-left bg-white hover:border-primary-300 focus:outline-none focus:border-primary-300 transition-colors">
        <Link2 className="w-3.5 h-3.5 text-calm-400 flex-shrink-0" />
        {selectedEvent ? (
          <span className="text-calm-700 truncate">{selectedEvent.title}</span>
        ) : (
          <span className="text-calm-400">不关联（日常记录）</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white rounded-xl border border-calm-200 shadow-lg overflow-hidden">
            {/* 搜索 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-calm-100">
              <Search className="w-3.5 h-3.5 text-calm-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="搜索事件..." className="flex-1 text-sm border-none outline-none text-calm-700 placeholder-calm-300" autoFocus />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {/* 不关联选项 */}
              <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-calm-50 transition-colors ${!selectedEventId ? "bg-primary-50 text-primary-600" : "text-calm-600"}`}>
                不关联（日常记录）
              </button>

              {filtered.map(ev => (
                <button key={ev.id} type="button" onClick={() => { onChange(ev.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-calm-50 transition-colors flex items-center justify-between gap-2 ${selectedEventId === ev.id ? "bg-primary-50 text-primary-600" : "text-calm-700"}`}>
                  <span className="truncate">{ev.title}</span>
                  <span className="text-[10px] text-calm-400 flex-shrink-0">{statusLabel[ev.resolutionStatus] || ev.resolutionStatus}</span>
                </button>
              ))}

              {filtered.length === 0 && search.trim() && (
                <p className="px-3 py-4 text-sm text-calm-400 text-center">没有匹配的事件</p>
              )}
            </div>

            {/* 新建事件 */}
            <div className="border-t border-calm-100">
              {showNewForm ? (
                <div className="p-3 space-y-2">
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="事件名称..." className="w-full text-sm border border-calm-200 rounded-lg px-3 py-1.5 text-calm-700 placeholder-calm-300 focus:outline-none focus:border-primary-300" />
                  <select value={newTopicId} onChange={e => setNewTopicId(e.target.value)}
                    className="w-full text-sm border border-calm-200 rounded-lg px-3 py-1.5 text-calm-700 bg-white focus:outline-none focus:border-primary-300">
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowNewForm(false)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-calm-50 text-calm-500 hover:bg-calm-100">取消</button>
                    <button type="button" onClick={handleCreate} disabled={!newTitle.trim() || creating}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40">
                      {creating ? "创建中..." : "新建"}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary-500 hover:bg-primary-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> 新建事件
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
