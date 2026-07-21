"use client";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, onSearch, placeholder = "搜索日记..." }: Props) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-calm-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSearch(value); }}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-calm-200 text-sm text-calm-700 placeholder-calm-300 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 transition-all"
        autoFocus
      />
      {value && (
        <button onClick={() => { onChange(""); onSearch(""); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-calm-100 text-calm-400 active:scale-95 transition-transform">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
