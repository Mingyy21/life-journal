"use client";
import Link from "next/link";
import { Calendar, BookOpen } from "lucide-react";
import type { Event } from "@/types";
import { EventBadge } from "./EventBadge";
import { ClientDate } from "./ClientDate";

interface Props {
  event: Event;
  diaryCount: number;
}

export default function EventCard({ event, diaryCount }: Props) {
  return (
    <Link href={`/events/${event.id}`}
      className="block bg-white rounded-xl border border-calm-100 hover:border-calm-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 p-4 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-calm-800 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>
        <EventBadge eventId={event.id} eventTitle="" status={event.resolutionStatus} linkable={false} />
      </div>
      {event.description && (
        <p className="text-xs text-calm-400 line-clamp-2 mb-2">{event.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-calm-400">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /><ClientDate date={event.createdAt} format="relative" /></span>
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{diaryCount} 篇日记</span>
        <span className="ml-auto text-calm-300"><ClientDate date={event.updatedAt} format="relative" />更新</span>
      </div>
    </Link>
  );
}
