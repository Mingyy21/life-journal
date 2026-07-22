"use client";
import { useState, useCallback } from "react";
import type { Diary, Topic, LifeDomain, AnalysisResult, DiaryFilter } from "@/types";
import { createDiary, updateDiary, deleteDiary, listDiaries, saveAnalysis, getAnalysis } from "@/lib/db";
import { db } from "@/lib/db";
import { useInit } from "@/components/InitProvider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useTopics, useDomains, useDiaries } from "./useData";

export function useDiary() {
  const { ready, error: initError, retry } = useInit();
  const [filter, setFilter] = useState<DiaryFilter | undefined>();
  const qc = useQueryClient();

  const diariesQuery = useDiaries(filter);
  const topicsQuery = useTopics();
  const domainsQuery = useDomains();

  const diaries = diariesQuery.data || [];
  const topics = topicsQuery.data || [];
  const domains = domainsQuery.data || [];
  const loading = !ready || diariesQuery.isLoading;
  const error = initError;

  const loadData = useCallback((f?: DiaryFilter) => {
    setFilter(f);
  }, []);

  const addDiary = useCallback(async (input: { title: string; content: string; topicIds: string[]; eventId: string | null }) => {
    const diary = await createDiary(input);
    qc.invalidateQueries({ queryKey: queryKeys.diaries() });
    return diary;
  }, [qc]);

  const editDiary = useCallback(async (id: string, input: { title?: string; content?: string; topicIds?: string[]; eventId?: string | null }) => {
    await updateDiary(id, input as any);
    qc.invalidateQueries({ queryKey: queryKeys.diaries() });
    if (input.eventId !== undefined) {
      qc.invalidateQueries({ queryKey: queryKeys.events });
    }
  }, [qc]);

  const removeDiary = useCallback(async (id: string) => {
    await deleteDiary(id);
    qc.invalidateQueries({ queryKey: queryKeys.diaries() });
  }, [qc]);

  const analyzeDiaryEntry = useCallback(async (diaryId: string): Promise<AnalysisResult> => {
    const diary = await db.diaries.get(diaryId);
    if (!diary) throw new Error("日记不存在");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: diary.title, content: diary.content }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `分析请求失败 (${res.status})`);
    }
    const analysis = await res.json();
    const result: AnalysisResult = {
      id: crypto.randomUUID(), diaryId,
      vadScore: analysis.vadScore, emotionLabels: analysis.emotionLabels,
      primaryEmotion: analysis.primaryEmotion, intensity: analysis.intensity,
      cognitiveStage: analysis.cognitiveStage, topics: analysis.topics, tags: analysis.tags,
      insight: analysis.insight, feedback: analysis.feedback,
      followUpQuestion: analysis.followUpQuestion, createdAt: new Date(),
    };
    await saveAnalysis(result);
    qc.invalidateQueries({ queryKey: queryKeys.diaries() });
    qc.invalidateQueries({ queryKey: queryKeys.analysis(diaryId) });
    return result;
  }, [qc]);

  const getDiaryAnalysis = useCallback(async (diaryId: string) => getAnalysis(diaryId), []);

  return { diaries, domains, topics, loading, ready, error, loadData, addDiary, editDiary, removeDiary, analyzeDiaryEntry, getDiaryAnalysis, retry };
}
