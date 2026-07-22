"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInit } from "@/components/InitProvider";
import { db, createDiary, updateDiary, deleteDiary, listDiaries, createEvent, updateEvent, deleteEvent, createInsight, deleteInsight } from "@/lib/db";
import type { Diary, Topic, LifeDomain, Event, Insight, DiaryFilter, EventFilter } from "@/types";

// ── Query Keys ──

export const queryKeys = {
  topics:           ["topics"] as const,
  domains:          ["domains"] as const,
  diaries:          (filter?: DiaryFilter) => ["diaries", filter] as const,
  events:           ["events"] as const,
  event:            (id: string) => ["events", id] as const,
  insights:         ["insights"] as const,
  insight:          (id: string) => ["insights", id] as const,
  topicEvents:      (topicId: string) => ["events", "topic", topicId] as const,
  topicInsights:    (topicId: string) => ["insights", "topic", topicId] as const,
  topicDiaries:     (topicId: string) => ["diaries", "topic", topicId] as const,
  eventDiaries:     (eventId: string) => ["diaries", "event", eventId] as const,
  analysis:         (diaryId: string) => ["analysis", diaryId] as const,
};

// ── Helpers ──

function useReady() {
  const { ready } = useInit();
  return ready;
}

const LONG_STALE = 5 * 60 * 1000;     // 5 min
const SHORT_STALE = 10 * 1000;        // 10 sec
const MED_STALE = 60 * 1000;          // 1 min

// ── Topics (reference data) ──

export function useTopics(initial?: Topic[]) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.topics,
    queryFn: () => db.topics.toArray(),
    staleTime: LONG_STALE,
    gcTime: 30 * 60 * 1000,
    enabled: ready,
    initialData: initial,
  });
}

// ── Domains (reference data) ──

export function useDomains(initial?: LifeDomain[]) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.domains,
    queryFn: () => db.lifeDomains.toArray(),
    staleTime: LONG_STALE,
    gcTime: 30 * 60 * 1000,
    enabled: ready,
    initialData: initial,
  });
}

// ── Diaries ──

export function useDiaries(filter?: DiaryFilter) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.diaries(filter),
    queryFn: () => listDiaries(filter),
    staleTime: SHORT_STALE,
    enabled: ready && !!filter,
  });
}

export function useAllDiaries() {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.diaries({}),
    queryFn: () => listDiaries({}),
    staleTime: SHORT_STALE,
    enabled: ready,
  });
}

export function useTopicDiaries(topicId: string) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.topicDiaries(topicId),
    queryFn: async () => {
      const all = await db.diaries.toArray();
      return all.filter(d => (d.topicIds || []).includes(topicId));
    },
    staleTime: SHORT_STALE,
    enabled: ready,
  });
}

export function useEventDiaries(eventId: string) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.eventDiaries(eventId),
    queryFn: async () => {
      const all = await db.diaries.toArray();
      return all.filter(d => d.eventId === eventId);
    },
    staleTime: SHORT_STALE,
    enabled: ready,
  });
}

// ── Events ──

export function useEvents() {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: () => db.events.orderBy("createdAt").reverse().toArray(),
    staleTime: MED_STALE,
    enabled: ready,
  });
}

export function useEvent(id: string) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => db.events.get(id),
    staleTime: 30 * 1000,
    enabled: ready && !!id,
  });
}

export function useTopicEvents(topicId: string) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.topicEvents(topicId),
    queryFn: () => db.events.where("topicId").equals(topicId).reverse().sortBy("createdAt"),
    staleTime: MED_STALE,
    enabled: ready && !!topicId,
  });
}

// ── Insights ──

export function useInsights() {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: () => db.insights.orderBy("createdAt").reverse().toArray(),
    staleTime: MED_STALE,
    enabled: ready,
  });
}

export function useTopicInsights(topicId: string) {
  const ready = useReady();
  return useQuery({
    queryKey: queryKeys.topicInsights(topicId),
    queryFn: async () => {
      const all = await db.insights.orderBy("createdAt").reverse().toArray();
      return all.filter(i => (i.linkedTopicIds || []).includes(topicId));
    },
    staleTime: MED_STALE,
    enabled: ready && !!topicId,
  });
}

// ── Mutations ──

export function useCreateDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string; topicIds: string[]; eventId: string | null }) =>
      createDiary(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diaries"] });
    },
  });
}

export function useUpdateDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Diary>) =>
      updateDiary(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diaries"] });
    },
  });
}

export function useDeleteDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDiary(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diaries"] });
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createEvent>[0]) => createEvent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; topicId?: string; title?: string; description?: string; resolutionStatus?: string; updatedAt?: Date }) =>
      updateEvent(id, input as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useCreateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createInsight>[0]) => createInsight(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

export function useDeleteInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInsight(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}
