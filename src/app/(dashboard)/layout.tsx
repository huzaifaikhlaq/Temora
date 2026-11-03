import type { ReactNode } from "react";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layouts/dashboard-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-low" aria-busy="true" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
