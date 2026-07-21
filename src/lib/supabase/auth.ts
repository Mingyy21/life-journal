import { supabase } from "./client";

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getUserId(): string | null {
  return supabase.auth.getSession().then(({ data }) => data.session?.user?.id ?? null) as any;
}

export function getUserIdSync(): string | null {
  // 仅用于初始化时快速检查，可能返回 null
  return null;
}

export function onAuthChange(callback: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null);
  });
}
