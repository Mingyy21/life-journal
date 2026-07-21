import type { Diary } from "@/types";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 在文本中高亮关键词，返回安全的HTML字符串 */
export function highlightText(text: string, keyword: string): string {
  if (!keyword.trim()) return escapeHtml(text);
  const safe = escapeHtml(text);
  const escapedKw = escapeRegex(keyword.trim());
  const regex = new RegExp(`(${escapedKw})`, "gi");
  return safe.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/** 对搜索结果排序：标题匹配权重 > 内容匹配，越新越靠前 */
export function rankResults(diaries: Diary[], keyword: string): Diary[] {
  const kw = keyword.toLowerCase();
  const now = Date.now();
  const scored = diaries.map(d => {
    const titleMatches = (d.title.toLowerCase().match(new RegExp(escapeRegex(kw), "gi")) || []).length;
    const contentMatches = (d.content.toLowerCase().match(new RegExp(escapeRegex(kw), "gi")) || []).length;
    const score = titleMatches * 3 + contentMatches;
    const daysAgo = (now - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = 1 - Math.min(daysAgo / 365, 1) * 0.3;
    return { diary: d, rank: score * recencyBoost };
  });
  return scored.sort((a, b) => b.rank - a.rank).map(s => s.diary);
}

/** 获取匹配关键词的上下文片段（前后约15字） */
export function getMatchSnippet(text: string, keyword: string, contextLen = 15): string {
  if (!keyword.trim()) return text.slice(0, contextLen * 2) + (text.length > contextLen * 2 ? "..." : "");
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text.slice(0, contextLen * 2) + (text.length > contextLen * 2 ? "..." : "");
  const start = Math.max(0, idx - contextLen);
  const end = Math.min(text.length, idx + keyword.length + contextLen);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}
