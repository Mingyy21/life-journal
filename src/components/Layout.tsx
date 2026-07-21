"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, Menu, X, Home, Compass, BarChart3, Search, Flag, LogOut } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { userId, email, loading, setShowAuthGate, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-warm-50 text-calm-800 font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-calm-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <span className="font-serif text-lg font-medium text-calm-900">人生手记</span>
          </Link>
          <div className="flex items-center gap-2">
            {!loading && !userId && (
              <button onClick={() => setShowAuthGate(true)} className="text-xs px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors active:scale-95">
                登录
              </button>
            )}
            {!loading && userId && email && (
              <button onClick={() => signOut()} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-calm-400 hover:text-calm-600 active:scale-95 transition-colors" title={email}>
                <span className="max-w-[80px] truncate hidden sm:inline">{email}</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-calm-100" aria-label="菜单">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm text-calm-500 hover:text-calm-800 flex items-center gap-1"><Home className="w-4 h-4" /> 首页</Link>
            <Link href="/events" className="text-sm text-calm-500 hover:text-calm-800 flex items-center gap-1"><Flag className="w-4 h-4" /> 事件</Link>
            <Link href="/search" className="text-sm text-calm-500 hover:text-calm-800 flex items-center gap-1"><Search className="w-4 h-4" /> 搜索</Link>
            <Link href="/topics" className="text-sm text-calm-500 hover:text-calm-800 flex items-center gap-1"><Compass className="w-4 h-4" /> 课题</Link>
            <Link href="/stats" className="text-sm text-calm-500 hover:text-calm-800 flex items-center gap-1"><BarChart3 className="w-4 h-4" /> 统计</Link>
          </nav>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-calm-100 bg-white animate-slide-up">
            <div className="max-w-2xl mx-auto px-4 py-2">
              <Link href="/" className="block px-3 py-2 rounded-lg text-sm hover:bg-calm-50" onClick={()=>setMenuOpen(false)}>首页</Link>
              <Link href="/events" className="block px-3 py-2 rounded-lg text-sm hover:bg-calm-50" onClick={()=>setMenuOpen(false)}>事件</Link>
              <Link href="/search" className="block px-3 py-2 rounded-lg text-sm hover:bg-calm-50" onClick={()=>setMenuOpen(false)}>搜索</Link>
              <Link href="/topics" className="block px-3 py-2 rounded-lg text-sm hover:bg-calm-50" onClick={()=>setMenuOpen(false)}>课题</Link>
              <Link href="/stats" className="block px-3 py-2 rounded-lg text-sm hover:bg-calm-50" onClick={()=>setMenuOpen(false)}>统计</Link>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6"><ErrorBoundary>{children}</ErrorBoundary></main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-calm-200 z-50 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-14">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-calm-400 hover:text-primary-600"><Home className="w-5 h-5" /><span className="text-xs">首页</span></Link>
          <Link href="/events" className="flex flex-col items-center gap-0.5 text-calm-400 hover:text-primary-600"><Flag className="w-5 h-5" /><span className="text-xs">事件</span></Link>
          <Link href="/topics" className="flex flex-col items-center gap-0.5 text-calm-400 hover:text-primary-600"><Compass className="w-5 h-5" /><span className="text-xs">课题</span></Link>
          <Link href="/stats" className="flex flex-col items-center gap-0.5 text-calm-400 hover:text-primary-600"><BarChart3 className="w-5 h-5" /><span className="text-xs">统计</span></Link>
        </div>
      </nav>
      <div className="md:hidden" style={{ height: `calc(56px + env(safe-area-inset-bottom, 0px))` }} />
    </div>
  );
}
