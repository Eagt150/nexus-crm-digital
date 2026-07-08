import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppHeader } from "@/components/nav/AppHeader";
import { Sidebar } from "@/components/nav/Sidebar";
import { TabBar } from "@/components/nav/TabBar";
import { ToastProvider } from "@/components/toast/ToastProvider";

export default function AppLayout({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <p className="max-w-sm text-sm text-muted">
          Falta configurar <code className="font-mono">NEXT_PUBLIC_CONVEX_URL</code> — corre{" "}
          <code className="font-mono">npx convex dev</code> para generarla.
        </p>
      </div>
    );
  }

  return (
    <AuthGate>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
            <TabBar />
          </div>
        </div>
      </ToastProvider>
    </AuthGate>
  );
}
