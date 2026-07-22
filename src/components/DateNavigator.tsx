"use client";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    onChange(d, dayStart(d), dayEnd(d));
  };

  const goToday = () => {
    onChange(today, dayStart(today), dayEnd(today));
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val + "T00:00:00");
    if (isNaN(d.getTime())) return;
    onChange(d, dayStart(d), dayEnd(d));
    setShowDatePicker(false);
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-calm-200 px-3 py-2">
      <button onClick={() => goDay(-1)} className="p-1 rounded-lg hover:bg-calm-100 text-calm-500">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-1.5 text-sm font-medium text-calm-800 hover:text-primary-600 transition-colors"
        >
          <CalendarDays className="w-4 h-4 text-calm-400" />
          <span>{isToday ? "今天" : formatDateKey(selectedDate)}</span>
        </button>

        {showDatePicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDatePicker(false)} />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl border border-calm-200 shadow-popup p-3">
              <input
                ref={pickerRef}
                type="date"
                defaultValue={toDateInputValue(selectedDate)}
                onChange={handleDatePickerChange}
                className="text-sm border border-calm-200 rounded-lg px-3 py-1.5 text-calm-700 focus:outline-none focus:border-primary-300"
                autoFocus
              />
            </div>
          </>
        )}

        {!isToday && (
          <button onClick={goToday} className="text-xs text-primary-500 hover:underline flex-shrink-0">
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
