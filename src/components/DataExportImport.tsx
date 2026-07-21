"use client";
import { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, CheckCircle2, Copy, ClipboardPaste } from "lucide-react";
import { db } from "@/lib/db";

async function importData(jsonText: string) {
  const data = JSON.parse(jsonText);
  if (!data.diaries || !data.topics || !data.domains) {
    throw new Error("文件格式不匹配");
  }
  await db.insights.clear();
  await db.diaries.clear();
  await db.analysisResults.clear();
  await db.events.clear();
  await db.topics.clear();
  await db.lifeDomains.clear();
  await db.lifeDomains.bulkAdd(data.domains);
  await db.topics.bulkAdd(data.topics);
  await db.diaries.bulkAdd(data.diaries);
  if (data.analyses?.length) await db.analysisResults.bulkAdd(data.analyses);
  if (data.events?.length) await db.events.bulkAdd(data.events);
  if (data.insights?.length) await db.insights.bulkAdd(data.insights);
  return { diaries: data.diaries.length, events: data.events?.length || 0, insights: data.insights?.length || 0 };
}

export default function DataExportImport() {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copying, setCopying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const buildExportData = async () => {
    const [diaries, topics, domains, analyses, events, insights] = await Promise.all([
      db.diaries.toArray(),
      db.topics.toArray(),
      db.lifeDomains.toArray(),
      db.analysisResults.toArray(),
      db.events.toArray(),
      db.insights.toArray(),
    ]);
    return { version: 2, exportedAt: new Date().toISOString(), diaries, topics, domains, analyses, events, insights };
  };

  const handleExport = async () => {
    try {
      const data = await buildExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `人生手记_备份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: "ok", text: `已导出 ${data.diaries.length} 篇日记、${data.events.length} 个事件、${data.insights.length} 条感悟` });
    } catch {
      setMsg({ type: "err", text: "导出失败" });
    }
  };

  const handleCopyExport = async () => {
    try {
      const data = await buildExportData();
      const json = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(json);
      setCopying(true);
      setMsg({ type: "ok", text: `已复制 ${data.diaries.length} 篇日记、${data.events.length} 个事件到剪贴板` });
      setTimeout(() => setCopying(false), 2000);
    } catch {
      setMsg({ type: "err", text: "复制失败，请检查剪贴板权限" });
    }
  };

  const handlePasteImport = async () => {
    setMsg(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { setMsg({ type: "err", text: "剪贴板为空" }); return; }
      const counts = await importData(text);
      setMsg({ type: "ok", text: `已导入 ${counts.diaries} 篇日记、${counts.events} 个事件、${counts.insights} 条感悟，刷新页面生效` });
    } catch (err) {
      setMsg({ type: "err", text: "导入失败：" + (err instanceof Error ? err.message : "无法读取剪贴板") });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const text = await file.text();
      const counts = await importData(text);
      setMsg({ type: "ok", text: `已导入 ${counts.diaries} 篇日记、${counts.events} 个事件、${counts.insights} 条感悟，刷新页面生效` });
    } catch (err) {
      setMsg({ type: "err", text: "导入失败：" + (err instanceof Error ? err.message : "文件损坏") });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-calm-200 p-5 shadow-card">
      <p className="text-xs text-calm-400 mb-3">数据备份</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors active:scale-95">
          <Download className="w-3.5 h-3.5" /> 导出 JSON
        </button>
        <button onClick={handleCopyExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors active:scale-95">
          <Copy className="w-3.5 h-3.5" /> {copying ? "已复制" : "复制到剪贴板"}
        </button>
        <button onClick={handlePasteImport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors active:scale-95">
          <ClipboardPaste className="w-3.5 h-3.5" /> 从剪贴板粘贴
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-calm-50 text-calm-600 hover:bg-calm-100 transition-colors active:scale-95">
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
