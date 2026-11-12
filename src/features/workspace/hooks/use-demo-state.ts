"use client";

import { createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";

const RealWorkspaceScope = createContext<{ workspaceId: string; userId: string } | null>(null);

export function DemoDataScopeProvider({ workspaceId, userId, children }: { workspaceId: string; userId: string; children: ReactNode }) {
  return createElement(RealWorkspaceScope.Provider, { value: { workspaceId, userId } }, children);
}

export function useDemoState() {
  const realWorkspace = useContext(RealWorkspaceScope);
  const state = useSyncExternalStore(
    demoRepository.subscribe,
    demoRepository.getSnapshot,
    demoRepository.getServerSnapshot,
  );

  useEffect(() => {
    demoRepository.hydrate();
  }, []);

  if (!realWorkspace) return state;
  return {
    ...state,
    activeWorkspaceId: realWorkspace.workspaceId,
    activeMemberId: realWorkspace.userId,
    workspaces: [],
    members: [],
    projects: [],
    tasks: [],
    comments: [],
    sprints: [],
    notifications: [],
    settingsByWorkspace: {},
  };
}
