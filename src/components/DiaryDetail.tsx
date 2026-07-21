"use client";
import { useState, useRef, useCallback } from "react";
import { Calendar, Clock, Pencil, Trash2, Link2, ArrowUpRight, Lightbulb } from "lucide-react";
import type { Diary, Topic, Event } from "@/types";
import { ClientDate } from "./ClientDate";
import { EventBadge } from "./EventBadge";

interface Props {
  diary: Diary;
  topics: Topic[];
  linkedEvent?: Event | null;
  onLinkEvent?: (eventId: string | null) => void;
  onUpgradeToEvent?: () => void;
  onExtractInsight?: (selectedText: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function DiaryDetail({ diary, topics, linkedEvent, onLinkEvent, onUpgradeToEvent, onExtractInsight, onEdit, onDelete }: Props) {
  const dts = (diary.topicIds || []).map(id => topics.find(t => t.id === id)).filter(Boolean) as Topic[];
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) { setSelection(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }, 10);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-calm-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-xl font-serif font-semibold text-calm-900">{diary.title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-calm-400 mb-6">
        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/><ClientDate date={diary.createdAt} format="full" /></span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/><ClientDate date={diary.createdAt} format="time" /></span>
        <span className="text-calm-300">{diary.wordCount} 字</span>
      </div>

      {dts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {dts.map(t => (
            <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: t.color }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      {linkedEvent && (
        <div className="mb-4">
          <EventBadge eventId={linkedEvent.id} eventTitle={linkedEvent.title} status={linkedEvent.resolutionStatus} />
        </div>
      )}

      {!linkedEvent && (onLinkEvent || onUpgradeToEvent) && (
        <div className="flex items-center gap-3 mb-4">
          {onLinkEvent && (
            <button onClick={() => onLinkEvent(null)} className="text-xs text-calm-400 hover:text-primary-500 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> 关联到事件
            </button>
          )}
          {onUpgradeToEvent && (
            <button onClick={onUpgradeToEvent} className="text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 升级为事件
            </button>
          )}
        </div>
      )}

      <div ref={contentRef} onMouseUp={onExtractInsight ? handleMouseUp : undefined} className="text-calm-700 leading-relaxed whitespace-pre-wrap text-base select-text">
        {diary.content}
      </div>

      {/* 浮动"提炼为感悟"按钮 */}
      {selection && onExtractInsight && (
        <div className="fixed z-50 transform -translate-x-1/2 -translate-y-full" style={{ left: selection.x, top: selection.y }}>
          <button
            onClick={() => {
              onExtractInsight(selection.text);
              setSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-medium shadow-lg hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            <Lightbulb className="w-3.5 h-3.5" /> 提炼为感悟
          </button>
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-calm-100">
          {onEdit && (
            <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-calm-50 text-calm-500 hover:bg-calm-100 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> 编辑
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> 删除
            </button>
          )}
        </div>
      )}
      {diary.updatedAt !== diary.createdAt && <p className="text-xs text-calm-300 mt-3">最后编辑于 <ClientDate date={diary.updatedAt} format="datetime" /></p>}
    </div>
  );
}
