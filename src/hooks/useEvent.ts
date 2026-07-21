"use client";
import { useState, useCallback } from "react";
import type { Event, ResolutionStatus, EventFilter } from "@/types";
import { db } from "@/lib/db";
import { createEvent as dbCreateEvent, updateEvent as dbUpdateEvent, deleteEvent as dbDeleteEvent, listEvents, getEventsByTopic } from "@/lib/db";

export function useEvent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async (filter?: EventFilter) => {
    setLoading(true);
    const list = await listEvents(filter);
    setEvents(list);
    setLoading(false);
    return list;
  }, []);

  const loadEventsByTopic = useCallback(async (topicId: string) => {
    const list = await getEventsByTopic(topicId);
    setEvents(list);
    return list;
  }, []);

  const createEvent = useCallback(async (input: { topicId: string; title: string; description?: string; resolutionStatus?: ResolutionStatus }) => {
    const event = await dbCreateEvent({
      topicId: input.topicId,
      title: input.title,
      description: input.description || "",
      resolutionStatus: input.resolutionStatus || "unresolved",
    });
    setEvents(prev => [event, ...prev]);
    return event;
  }, []);

  const updateEvent = useCallback(async (id: string, input: { title?: string; description?: string; resolutionStatus?: ResolutionStatus }) => {
    await dbUpdateEvent(id, input);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...input, updatedAt: new Date() } : e));
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await dbDeleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { events, loading, loadEvents, loadEventsByTopic, createEvent, updateEvent, deleteEvent };
}
