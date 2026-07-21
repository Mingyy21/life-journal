"use client";
import type { ResolutionStatus } from "@/types";

const config: Record<ResolutionStatus, { label: string; bg: string; text: string }> = {
  unresolved:   { label: "刚开始", bg: "#FFF3E0", text: "#E65100" },
  in_progress:  { label: "解决中", bg: "#E3F2FD", text: "#1565C0" },
  avoiding:     { label: "逃避中", bg: "#F3E5F5", text: "#7B1FA2" },
  accepted:     { label: "无法解决", bg: "#ECEFF1", text: "#546E7A" },
  resolved:     { label: "已解决", bg: "#E8F5E9", text: "#2E7D32" },
};

export function ResolutionBadge({ status, className = "" }: { status: ResolutionStatus; className?: string }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}
