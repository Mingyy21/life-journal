"use client";
import Link from "next/link";
import { Link2 } from "lucide-react";
import type { ResolutionStatus } from "@/types";

const config: Record<ResolutionStatus, { label: string; bg: string; text: string }> = {
  unresolved:   { label: "未解决", bg: "#FFF3E0", text: "#E65100" },
  in_progress:  { label: "解决中", bg: "#E3F2FD", text: "#1565C0" },
  avoiding:     { label: "逃避中", bg: "#F3E5F5", text: "#7B1FA2" },
  accepted:     { label: "已接纳", bg: "#ECEFF1", text: "#546E7A" },
  resolved:     { label: "已解决", bg: "#E8F5E9", text: "#2E7D32" },
};

interface Props {
  eventId: string;
  eventTitle: string;
  status: ResolutionStatus;
  linkable?: boolean;
}

export function EventBadge({ eventId, eventTitle, status, linkable = true }: Props) {
  const c = config[status];
  const inner = (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ backgroundColor: c.bg }}>
      <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: c.text }} />
      <span className="font-medium" style={{ color: c.text }}>{eventTitle}</span>
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: c.text + "1A", color: c.text }}>
        {c.label}
      </span>
    </span>
  );

  if (linkable) return <Link href={`/events/${eventId}`}>{inner}</Link>;
  return inner;
}
