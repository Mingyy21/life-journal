"use client";
import { useState, useEffect } from "react";

export function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

/** 仅在客户端渲染日期，避免 SSR hydration 不匹配 */
export function ClientDate({ date, format }: { date: Date; format: "full" | "short" | "time" | "relative" | "datetime" }) {
  const mounted = useHasMounted();
  if (!mounted) return <span suppressHydrationWarning className="inline-block h-4 w-20 bg-transparent" />;

  const d = new Date(date);
  switch (format) {
    case "full":
      return <span suppressHydrationWarning>{d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</span>;
    case "short":
      return <span suppressHydrationWarning>{d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>;
    case "time":
      return <span suppressHydrationWarning>{d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>;
    case "datetime":
      return <span suppressHydrationWarning>{d.toLocaleString("zh-CN")}</span>;
    case "relative": {
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return <span suppressHydrationWarning>今天</span>;
      if (days === 1) return <span suppressHydrationWarning>昨天</span>;
      if (days < 7) return <span suppressHydrationWarning>{days}天前</span>;
      return <span suppressHydrationWarning>{d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>;
    }
  }
}

export function ClientDateGroup({ date }: { date: Date }) {
  const mounted = useHasMounted();
  if (!mounted) return <span suppressHydrationWarning className="inline-block h-5 w-32 bg-transparent" />;
  const d = new Date(date);
  return <span suppressHydrationWarning>{d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</span>;
}
