"use client";
import { useState, useCallback } from "react";
import type { Insight } from "@/types";
import { db } from "@/lib/db";
import { createInsight as dbCreateInsight, deleteInsight as dbDeleteInsight, listInsights } from "@/lib/db";

export function useInsight() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInsights = useCallback(async (filter?: { linkedEventId?: string; linkedTopicId?: string }) => {
    setLoading(true);
    const list = await listInsights(filter);
    setInsights(list);
    setLoading(false);
    return list;
  }, []);

  const createInsight = useCallback(async (input: {
    title: string; content: string;
    linkedEventIds: string[]; linkedTopicIds: string[];
    sourceDiaryId?: string;
  }) => {
    const insight = await dbCreateInsight(input);
    setInsights(prev => [insight, ...prev]);
    return insight;
  }, []);

  const deleteInsight = useCallback(async (id: string) => {
    await dbDeleteInsight(id);
    setInsights(prev => prev.filter(i => i.id !== id));
  }, []);

  return { insights, loading, loadInsights, createInsight, deleteInsight };
}
