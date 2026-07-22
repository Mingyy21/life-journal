"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { Diary, Topic, LifeDomain, AnalysisResult } from "@/types";
import { createDiary, updateDiary, deleteDiary, listDiaries, saveAnalysis, getAnalysis, ensureDb } from "@/lib/db";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";

export function useDiary() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [domains, setDomains] = useState<LifeDomain[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const loadData = useCallback(async (filter?: { domainId?: string; topicId?: string; eventId?: string; keyword?: string; dateFrom?: Date; dateTo?: Date }) => {
    setLoading(true);
    try {
      const [dl, dl2, tl] = await Promise.all([
        listDiaries(filter),
        db.lifeDomains.toArray(),
        db.topics.toArray(),
      ]);
      setDiaries(dl);
      setDomains(dl2);
      setTopics(tl);
    } catch (err) { console.error("加载失败:", err); }
    finally { setLoading(false); }
  }, []);

  const init = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    try {
      await ensureDb();
      setReady(true);
      await loadData();
    } catch (err) {
      console.error("数据库初始化失败:", err);
      setError(err instanceof Error ? err.message : "数据库初始化失败");
    }
  }, [loadData]);

  const retry = useCallback(async () => {
    setError(null);
    initRef.current = false;
    try {
      await ensureDb();
      setReady(true);
      await loadData();
    } catch (err) {
      console.error("数据库初始化失败:", err);
      setError(err instanceof Error ? err.message : "数据库初始化失败");
    }
  }, [loadData]);

  // 组件挂载时自动初始化（不阻塞渲染）
  useEffect(() => { init(); }, [init]);

  // 登录态恢复后自动重试
  const { userId: authUserId, loading: authLoading } = useAuth();
  const prevAuthRef = useRef<string | null>(null);

  useEffect(() => {
    // authUserId 从 null→有值，且之前有错误 → 自动重试
    if (!authLoading && authUserId && error && authUserId !== prevAuthRef.current) {
      prevAuthRef.current = authUserId;
      retry();
    }
    if (!authLoading && authUserId) {
      prevAuthRef.current = authUserId;
    }
  }, [authUserId, authLoading, error]);

  const addDiary = useCallback(async (input: { title: string; content: string; topicIds: string[]; eventId: string | null }) => {
    const diary = await createDiary(input);
    await loadData();
    return diary;
  }, [loadData]);

  const editDiary = useCallback(async (id: string, input: { title?: string; content?: string; topicIds?: string[]; eventId?: string | null }) => {
    await updateDiary(id, input);
    await loadData();
  }, [loadData]);

  const removeDiary = useCallback(async (id: string) => {
    await deleteDiary(id);
    await loadData();
  }, [loadData]);

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
    await loadData();
    return result;
  }, [loadData]);

  const getDiaryAnalysis = useCallback(async (diaryId: string) => getAnalysis(diaryId), []);

  return { diaries, domains, topics, loading, ready, error, loadData, addDiary, editDiary, removeDiary, analyzeDiaryEntry, getDiaryAnalysis, retry };
}
