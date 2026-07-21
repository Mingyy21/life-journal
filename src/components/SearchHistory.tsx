"use client";
import { Clock, X, Trash2 } from "lucide-react";

interface Props {
  history: { keyword: string; timestamp: number }[];
  onSelect: (keyword: string) => void;
  onClear: () => void;
  onRemove: (keyword: string) => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

export default function SearchHistory({ history, onSelect, onClear, onRemove }: Props) {
  if (history.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-calm-400 flex items-center gap-1"><Clock className="w-3 h-3" /> 搜索历史</p>
        <button onClick={onClear} className="text-xs text-calm-400 hover:text-red-400 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> 清除</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {history.map(h => (
          <span key={h.keyword + h.timestamp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-calm-50 text-xs text-calm-500 hover:bg-calm-100 cursor-pointer transition-colors group">
            <button onClick={() => onSelect(h.keyword)} className="flex items-center gap-1">
              <span>{h.keyword}</span>
              <span className="text-calm-300">{relativeTime(h.timestamp)}</span>
            </button>
            <button onClick={e => { e.stopPropagation(); onRemove(h.keyword); }} className="ml-0.5 text-calm-300 hover:text-calm-500">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
