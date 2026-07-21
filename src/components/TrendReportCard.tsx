"use client";
import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, TrendingUp, Calendar, Star } from "lucide-react";

export interface TrendCardReport {
  title: string;
  sections: { heading: string; content: string }[];
}

interface Props {
  scope: "weekly" | "monthly" | "yearly";
  label: string;
  hasData: boolean;
  loading: boolean;
  report: TrendCardReport | null;
  error: string | null;
  onGenerate: () => void;
}

const ICONS = {
  weekly: { Icon: TrendingUp, color: "text-primary-400" },
  monthly: { Icon: Calendar, color: "text-amber-400" },
  yearly: { Icon: Star, color: "text-emerald-400" },
};

export default function TrendReportCard({ scope, label, hasData, loading, report, error, onGenerate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { Icon, color } = ICONS[scope];

  return (
    <div className="bg-white rounded-xl border border-calm-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className="text-sm font-medium text-calm-700">{label}回顾</h3>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button onClick={() => setCollapsed(!collapsed)} className="text-calm-300 hover:text-calm-500">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onGenerate} disabled={loading || !hasData}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {report ? "重新生成" : "生成"}
          </button>
        </div>
      </div>

      {!hasData && !report && (
        <p className="text-xs text-calm-400 py-2">该时间范围内还没有日记记录</p>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-50 rounded-lg p-2">
          {error}
        </div>
      )}

      {report && !collapsed && (
        <div className="space-y-3 animate-fade-in">
          <div className="bg-calm-50 rounded-xl p-3">
            <p className="text-xs text-calm-500 mb-2">AI生成于 {new Date().toLocaleString("zh-CN")}</p>
            {report.sections.map((s, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <p className="text-xs font-medium text-calm-600 mb-0.5">{s.heading}</p>
                <p className="text-sm text-calm-700 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
