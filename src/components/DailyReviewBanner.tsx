"use client";
import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";

interface Props {
  diaryCount: number;
  onRequestReview: () => Promise<string | null>;
}

export default function DailyReviewBanner({ diaryCount, onRequestReview }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [reviewText, setReviewText] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed || diaryCount < 2) return null;

  const handleReview = async () => {
    setReviewing(true);
    setError(null);
    try {
      const result = await onRequestReview();
      setReviewText(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "复盘失败");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary-50 to-amber-50 rounded-2xl border border-primary-100 p-5 shadow-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <p className="text-sm font-medium text-calm-700">今日复盘</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-calm-300 hover:text-calm-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!reviewText && !reviewing && (
        <div>
          <p className="text-xs text-calm-500 mb-3">今天已写了 {diaryCount} 篇日记，要来一个快速复盘吗？</p>
          <button onClick={handleReview}
            className="px-4 py-1.5 text-xs font-medium rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors">
            生成今日复盘
          </button>
        </div>
      )}

      {reviewing && (
        <div className="flex items-center gap-2 text-sm text-calm-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在分析今天的心情...
        </div>
      )}

      {reviewText && (
        <div className="bg-white rounded-xl p-3 text-sm text-calm-700 leading-relaxed whitespace-pre-wrap">
          {reviewText}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 mt-2">
          {error}
          <button onClick={handleReview} className="ml-2 text-red-400 hover:text-red-500 underline">重试</button>
        </div>
      )}
    </div>
  );
}
