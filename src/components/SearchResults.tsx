"use client";
import Link from "next/link";
import { Brain, Clock } from "lucide-react";
import { highlightText, getMatchSnippet } from "@/lib/searchEngine";
import { ClientDate } from "./ClientDate";
import type { Diary, Topic } from "@/types";

interface Props {
  results: Diary[];
  topics: Topic[];
  keyword: string;
  isLoading: boolean;
}

export default function SearchResults({ results, topics, keyword, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-calm-200 p-5 animate-pulse">
            <div className="h-4 bg-calm-100 rounded w-3/4 mb-3" />
            <div className="h-3 bg-calm-50 rounded w-full mb-1" />
            <div className="h-3 bg-calm-50 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!keyword.trim()) return null;

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-calm-400 text-sm">没有找到相关日记</p>
        <p className="text-calm-300 text-xs mt-1">试试其他关键词</p>
      </div>
    );
  }

  const topicMap = new Map(topics.map(t => [t.id, t]));

  return (
    <div className="space-y-3">
      <p className="text-xs text-calm-400">找到 {results.length} 篇日记</p>
      {results.map(diary => {
        const dts = (diary.topicIds || []).map(id => topicMap.get(id)).filter(Boolean) as Topic[];
        return (
          <Link key={diary.id} href={`/diary/${diary.id}`} className="block bg-white rounded-xl border border-calm-200 p-5 hover:border-primary-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3
                className="text-base font-serif font-medium text-calm-900 line-clamp-1"
                dangerouslySetInnerHTML={{ __html: highlightText(diary.title, keyword) }}
              />
            </div>
            <p
              className="text-sm text-calm-500 leading-relaxed line-clamp-2 mb-2"
              dangerouslySetInnerHTML={{ __html: highlightText(getMatchSnippet(diary.content, keyword), keyword) }}
            />
            <div className="flex items-center gap-2 text-xs text-calm-400">
              <Clock className="w-3 h-3" />
              <ClientDate date={diary.createdAt} format="relative" />
              {diary.hasAnalysis && <Brain className="w-3 h-3 text-primary-400" />}
              {dts.length > 0 && (
                <div className="flex gap-1 ml-auto">
                  {dts.slice(0, 2).map(t => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: t.color }}>{t.name}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
