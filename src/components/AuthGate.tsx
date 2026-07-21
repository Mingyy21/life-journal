"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, X, UserPlus, Loader2 } from "lucide-react";

export default function AuthGate() {
  const { signIn, signUp, showAuthGate, setShowAuthGate } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!showAuthGate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        // After signup, the user may need to sign in
        setIsSignUp(false);
        setError("注册成功，请登录");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-popup w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-serif font-semibold text-calm-900">
            {isSignUp ? "创建账号" : "登录"}
          </h2>
          <button onClick={() => setShowAuthGate(false)} className="p-2 rounded-lg hover:bg-calm-100 text-calm-400 active:scale-95 transition-transform">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="邮箱地址"
            autoComplete="email"
            className="w-full px-4 py-2.5 text-sm border border-calm-200 rounded-lg outline-none focus:border-primary-300"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码（至少6位）"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
            className="w-full px-4 py-2.5 text-sm border border-calm-200 rounded-lg outline-none focus:border-primary-300"
            required
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <><UserPlus className="w-4 h-4" /> 注册</>
            ) : (
              <><LogIn className="w-4 h-4" /> 登录</>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-calm-400">
          {isSignUp ? "已有账号？" : "没有账号？"}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="ml-1 text-primary-600 hover:underline">
            {isSignUp ? "去登录" : "注册"}
          </button>
        </p>
      </div>
    </div>
  );
}
