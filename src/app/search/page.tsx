"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import SearchHistory from "@/components/SearchHistory";
import { useSearch } from "@/hooks/useSearch";
import { db } from "@/lib/db";
import type { Topic } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  const { query, setQuery, results, isLoading, history, clearHistory, removeHistoryItem, handleSearch } = useSearch();
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    db.topics.toArray().then(setTopics).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-calm-400 hover:text-calm-600"><ArrowLeft className="w-4 h-4" /> 返回</button>

      <SearchBar value={query} onChange={setQuery} onSearch={handleSearch} />

      {query.trim() === "" ? (
        <SearchHistory history={history} onSelect={keyword => { setQuery(keyword); handleSearch(keyword); }} onClear={clearHistory} onRemove={removeHistoryItem} />
      ) : (
        <SearchResults results={results} topics={topics} keyword={query} isLoading={isLoading} />
      )}

      {query.trim() === "" && history.length === 0 && (
        <div className="text-center py-12">
          <SearchIcon className="w-8 h-8 text-calm-300 mx-auto mb-2" />
          <p className="text-calm-400 text-sm">输入关键词搜索你的日记</p>
          <p className="text-calm-300 text-xs mt-1">支持搜索标题和内容</p>
        </div>
      )}
    </div>
  );
}
