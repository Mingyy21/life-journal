"use client";
import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/db";
import { rankResults } from "@/lib/searchEngine";
import type { Diary } from "@/types";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 20;

interface SearchEntry {
  keyword: string;
  timestamp: number;
}

function loadHistory(): SearchEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(e => e.keyword && typeof e.timestamp === "number");
  } catch { return []; }
}

function saveHistory(history: SearchEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY))); } catch {}
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Diary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<SearchEntry[]>([]);

  useEffect(() => { setHistory(loadHistory()); }, []);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); return; }
    setIsLoading(true);
    try {
      const all = await db.diaries.orderBy("createdAt").reverse().toArray();
      const filtered = all.filter(d =>
        d.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        d.content.toLowerCase().includes(trimmed.toLowerCase())
      );
      setResults(rankResults(filtered, trimmed));
    } catch { setResults([]); }
    finally { setIsLoading(false); }
  }, []);

  const addToHistory = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const filtered = prev.filter(h => h.keyword !== trimmed);
      const next = [{ keyword: trimmed, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }, []);

  const removeHistoryItem = useCallback((keyword: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.keyword !== keyword);
      saveHistory(next);
      return next;
    });
  }, []);

  const handleSearch = useCallback((keyword: string) => {
    addToHistory(keyword);
    doSearch(keyword);
  }, [addToHistory, doSearch]);

  return { query, setQuery, results, isLoading, history, clearHistory, removeHistoryItem, handleSearch };
}
