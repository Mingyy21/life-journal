"use client";
import { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";

export default function DataExportImport() {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const [diaries, topics, domains, analyses, events, insights] = await Promise.all([
        db.diaries.toArray(),
        db.topics.toArray(),
        db.lifeDomains.toArray(),
        db.analysisResults.toArray(),
        db.events.toArray(),
        db.insights.toArray(),
      ]);
      const data = { version: 2, exportedAt: new Date().toISOString(), diaries, topics, domains, analyses, events, insights };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `人生手记_备份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: "ok", text: `已导出 ${diaries.length} 篇日记、${events.length} 个事件、${insights.length} 条感悟` });
    } catch (e) {
      setMsg({ type: "err", text: "导出失败" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.diaries || !data.topics || !data.domains) {
        setMsg({ type: "err", text: "文件格式不匹配" });
        return;
      }
      await db.transaction("rw", db.diaries, db.topics, db.lifeDomains, db.analysisResults, db.events, async () => {
        await db.diaries.clear();
        await db.topics.clear();
        await db.lifeDomains.clear();
        await db.analysisResults.clear();
        await db.events.clear();
        await db.insights.clear();
        await db.lifeDomains.bulkAdd(data.domains);
        await db.topics.bulkAdd(data.topics);
        await db.diaries.bulkAdd(data.diaries);
        if (data.analyses?.length) await db.analysisResults.bulkAdd(data.analyses);
        if (data.events?.length) await db.events.bulkAdd(data.events);
        if (data.insights?.length) await db.insights.bulkAdd(data.insights);
      });
      const eventCount = data.events?.length || 0;
      const insightCount = data.insights?.length || 0;
      setMsg({ type: "ok", text: `已导入 ${data.diaries.length} 篇日记、${eventCount} 个事件、${insightCount} 条感悟，刷新页面生效` });
    } catch (err) {
      setMsg({ type: "err", text: "导入失败：" + (err instanceof Error ? err.message : "文件损坏") });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-calm-200 p-4">
      <p className="text-xs text-calm-400 mb-3">数据备份</p>
      <div className="flex gap-2">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors">
          <Download className="w-3.5 h-3.5" /> 导出 JSON
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors">
          <Upload className="w-3.5 h-3.5" /> 导入 JSON
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>
      {msg && (
        <p className={`mt-2 text-xs flex items-center gap-1 ${msg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>
          {msg.type === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {msg.text}
        </p>
      )}
    </div>
  );
}
