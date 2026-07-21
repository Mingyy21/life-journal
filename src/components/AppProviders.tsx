"use client";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGate from "./AuthGate";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthGate />
    </AuthProvider>
  );
}
