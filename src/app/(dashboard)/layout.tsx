import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/layouts/dashboard-shell";
import type { AuthUser } from "@/features/authentication/lib/auth-client";
import type { Workspace } from "@/features/workspace/types";
import { identityFetch } from "@/lib/identity";
import { workspaceFetch } from "@/lib/workspace";

async function AuthenticatedDashboard({ children, modal }: { children: ReactNode; modal?: ReactNode }) {
  let identity: Response;
  try { identity = await identityFetch("me", { method: "GET" }, true); }
  catch { throw new Error("Identity service is currently unavailable."); }
  if (identity.status === 401 || identity.status === 403) redirect("/sign-in");
  if (!identity.ok) throw new Error("Unable to validate your session.");

  let workspaceResponse: Response;
  try { workspaceResponse = await workspaceFetch("workspaces", { method: "GET" }); }
  catch { throw new Error("Workspace service is currently unavailable."); }
  if (workspaceResponse.status === 401 || workspaceResponse.status === 403) redirect("/sign-in");
  if (!workspaceResponse.ok) throw new Error("Unable to load your workspaces.");

  const { user } = await identity.json() as { user: AuthUser };
  const workspaces = await workspaceResponse.json() as Workspace[];
  if (workspaces.length === 0) redirect("/workspace/setup");

  const workspaceId = (await cookies()).get("temora_active_workspace")?.value;
  if (!workspaceId) redirect("/workspace/select");
  const activeWorkspace = workspaces.find((item) => item.id === workspaceId);
  if (!activeWorkspace) redirect("/workspace/select");

  return <><DashboardShell user={user} workspaces={workspaces} activeWorkspace={activeWorkspace}>{children}</DashboardShell>{modal}</>;
}

export default function WorkspaceLayout({ children, modal }: { children: ReactNode; modal?: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-surface-low" aria-busy="true" />}><AuthenticatedDashboard modal={modal}>{children}</AuthenticatedDashboard></Suspense>;
}
