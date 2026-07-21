"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { findRelatedOldDiary, type RelatedOldDiary } from "@/lib/weekMemory";

interface Props {
  currentDiaryId: string;
}

export default function HistoryTrigger({ currentDiaryId }: Props) {
  const [related, setRelated] = useState<RelatedOldDiary | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function find() {
      try {
        const [current, allDiaries, allTopics] = await Promise.all([
          db.diaries.get(currentDiaryId),
          db.diaries.toArray(),
          db.topics.toArray(),
        ]);
        if (!current) return;
        const topicNameMap: Record<string, string> = {};
        allTopics.forEach(t => { topicNameMap[t.id] = t.name; });
        const result = findRelatedOldDiary(current, allDiaries, topicNameMap);
        setRelated(result);
      } catch { /* silently fail */ }
    }
    find();
  }, [currentDiaryId]);

  if (!related) return null;

  return (
    <div className="text-center mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-calm-300 hover:text-calm-400 transition-colors leading-relaxed"
      >
        {related.daysAgo}天前你也写到了"{related.sharedTopicName}"——现在感觉有什么不同吗？
      </button>
      {expanded && (
        <div className="mt-2 p-3 bg-calm-50 rounded-xl border border-calm-100 text-left animate-fade-in">
          <p className="text-xs text-calm-500 mb-1.5 leading-relaxed line-clamp-3">
            {related.diary.content.slice(0, 150)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-calm-400">{related.diary.title}</span>
            <Link
              href={`/diary/${related.diary.id}`}
              className="text-xs text-primary-500 hover:text-primary-600"
            >
              查看完整记录 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
