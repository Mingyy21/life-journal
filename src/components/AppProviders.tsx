"use client";
import { AuthProvider } from "@/hooks/useAuth";
import QueryProvider from "./QueryProvider";
import InitProvider from "./InitProvider";
import AuthGate from "./AuthGate";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryProvider>
        <InitProvider>
          {children}
          <AuthGate />
        </InitProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
