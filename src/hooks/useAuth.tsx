"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { setUserId } from "@/lib/supabase/dexie-compat";

interface AuthState {
  loading: boolean;
  userId: string | null;
  email: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  showAuthGate: boolean;
  setShowAuthGate: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, userId: null, email: null });
  const [showAuthGate, setShowAuthGate] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setState({ loading: false, userId: uid, email: data.session?.user?.email ?? null });
      setUserId(uid);
      if (!uid) setShowAuthGate(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setState({ loading: false, userId: uid, email: session?.user?.email ?? null });
      setUserId(uid);
      if (!uid) setShowAuthGate(true);
      else setShowAuthGate(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Supabase auto-signs-in after signUp by default (if email confirm is off)
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setShowAuthGate(true);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, showAuthGate, setShowAuthGate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
