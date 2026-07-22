"use client";
import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ensureDb, resetDbState } from "@/lib/db";

interface InitState {
  ready: boolean;
  error: string | null;
  retry: () => void;
}

const InitContext = createContext<InitState>({ ready: false, error: null, retry: () => {} });

export function useInit() {
  return useContext(InitContext);
}

export default function InitProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading } = useAuth();
  const [state, setState] = useState<InitState>({ ready: false, error: null, retry: () => {} });
  const initRef = useRef(false);

  const doInit = useCallback(() => {
    if (!userId) return;
    initRef.current = true;
    setState(prev => ({ ...prev, error: null }));

    ensureDb()
      .then(() => setState({ ready: true, error: null, retry: doInit }))
      .catch((err) => {
        initRef.current = false;
        setState({ ready: false, error: err instanceof Error ? err.message : "初始化失败", retry: doInit });
      });
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      resetDbState();
      initRef.current = false;
      setState({ ready: false, error: null, retry: () => {} });
      return;
    }
    if (initRef.current) return;
    doInit();
  }, [userId, authLoading, doInit]);

  return <InitContext.Provider value={state}>{children}</InitContext.Provider>;
}
