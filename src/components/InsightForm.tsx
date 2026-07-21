"use client";
import { useState } from "react";
import { Lightbulb, X, Save } from "lucide-react";
import type { Topic, Event } from "@/types";

interface Props {
  topics: Topic[];
  events: Event[];
  initialContent?: string;
  initialTopicIds?: string[];
  initialEventIds?: string[];
  sourceDiaryId?: string;
  onSave: (input: { title: string; content: string; linkedEventIds: string[]; linkedTopicIds: string[] }) => Promise<void>;
  onCancel: () => void;
}

export default function InsightForm({ topics, events, initialContent = "", initialTopicIds = [], initialEventIds = [], sourceDiaryId, onSave, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [linkedTopicIds, setLinkedTopicIds] = useState<string[]>(initialTopicIds);
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>(initialEventIds);
  const [saving, setSaving] = useState(false);

  const toggleTopic = (id: string) => {
    setLinkedTopicIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleEvent = (id: string) => {
    setLinkedEventIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), content: content.trim(), linkedEventIds, linkedTopicIds });
      setTitle(""); setContent(""); setLinkedTopicIds([]); setLinkedEventIds([]);
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-amber-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-medium text-calm-800">新感悟</h3>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="给感悟起个标题..." className="w-full text-sm font-medium text-calm-900 placeholder-calm-300 border border-calm-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-amber-300" />

      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder="你的感悟是什么？" rows={4}
        className="w-full text-sm text-calm-700 placeholder-calm-300 border border-calm-200 rounded-lg px-3 py-2 resize-none leading-relaxed mb-3 focus:outline-none focus:border-amber-300" />

      {/* 关联课题 */}
      <div className="mb-3">
        <p className="text-xs text-calm-400 mb-1.5">关联课题</p>
        <div className="flex flex-wrap gap-1.5">
          {topics.map(t => (
            <button key={t.id} onClick={() => toggleTopic(t.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                linkedTopicIds.includes(t.id) ? "text-white shadow-sm" : "text-calm-500 bg-calm-50 hover:bg-calm-100"
              }`} style={linkedTopicIds.includes(t.id) ? { backgroundColor: t.color } : {}}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 关联事件 */}
      {events.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-calm-400 mb-1.5">关联事件</p>
          <div className="flex flex-wrap gap-1.5">
            {events.map(ev => (
              <button key={ev.id} onClick={() => toggleEvent(ev.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  linkedEventIds.includes(ev.id) ? "bg-calm-800 text-white" : "bg-calm-50 text-calm-500 hover:bg-calm-100"
                }`}>
                {ev.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-calm-100">
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-sm text-calm-400 hover:text-calm-600"><X className="w-4 h-4" /> 取消</button>
        <button onClick={handleSave} disabled={!title.trim() || !content.trim() || saving}
          className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 text-white rounded-full text-sm font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
          <Save className="w-4 h-4" /> 保存
        </button>
      </div>
    </div>
  );
}
