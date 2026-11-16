"use client";

import { createContext, useContext, type ReactNode } from "react";

type WorkspaceScope = { workspaceId: string; userId: string };
const WorkspaceScopeContext = createContext<WorkspaceScope | null>(null);

export function WorkspaceScopeProvider({ workspaceId, userId, children }: WorkspaceScope & { children: ReactNode }) {
  return <WorkspaceScopeContext.Provider value={{ workspaceId, userId }}>{children}</WorkspaceScopeContext.Provider>;
}

export function useWorkspaceScope() {
  return useContext(WorkspaceScopeContext);
}
