"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayStart(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function dayEnd(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

interface Props {
  selectedDate: Date;
  onChange: (date: Date, dateFrom: Date, dateTo: Date) => void;
}

export default function DateNavigator({ selectedDate, onChange }: Props) {
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    onChange(d, dayStart(d), dayEnd(d));
  };

  const goToday = () => {
    onChange(today, dayStart(today), dayEnd(today));
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-calm-200 px-3 py-2">
      <button onClick={() => goDay(-1)} className="p-1 rounded-lg hover:bg-calm-100 text-calm-500">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-calm-800">
          {isToday ? "今天" : formatDateKey(selectedDate)}
        </span>
        {!isToday && (
          <button onClick={goToday} className="text-xs text-primary-500 hover:underline">
            回到今天
          </button>
        )}
      </div>

      <button
        onClick={() => goDay(1)}
        disabled={isToday}
        className="p-1 rounded-lg hover:bg-calm-100 text-calm-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
