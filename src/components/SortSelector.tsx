"use client";

export type SortMode = "recent" | "unresolved" | "frequency";

const OPTIONS: { value: SortMode; label: string }[] = [
  { value: "recent", label: "最近" },
  { value: "unresolved", label: "未解决" },
  { value: "frequency", label: "频率" },
];

export default function SortSelector({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div className="flex gap-1 bg-calm-50 rounded-xl p-1">
      {OPTIONS.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === o.value ? "bg-calm-800 text-white shadow-sm" : "text-calm-400 hover:text-calm-600"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
