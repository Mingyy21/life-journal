"use client";
import { Lightbulb, X } from "lucide-react";
import { ClientDate } from "./ClientDate";

interface Props {
  topicName: string;
  topicColor: string;
  count: number;
  earliestDate: Date;
  latestDate: Date;
  onCreateEvent: () => void;
  onDismiss: () => void;
}

export default function SuggestEventBanner({ topicName, topicColor, count, earliestDate, latestDate, onCreateEvent, onDismiss }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: topicColor + "20" }}>
          <Lightbulb className="w-4 h-4" style={{ color: topicColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-calm-700">
              你在课题 <span className="font-medium" style={{ color: topicColor }}>{topicName}</span> 下已有 <span className="font-semibold">{count}</span> 篇日记，要归纳为一个事件吗？
            </p>
            <button onClick={onDismiss} className="text-calm-300 hover:text-calm-500 flex-shrink-0"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-calm-400 mt-1">
            <ClientDate date={earliestDate} format="short" /> 至 <ClientDate date={latestDate} format="short" />
          </p>
          <button onClick={onCreateEvent}
            className="mt-2 px-4 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
            创建事件
          </button>
        </div>
      </div>
    </div>
  );
}
