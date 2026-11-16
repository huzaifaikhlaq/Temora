"use client";

import { useEffect, useSyncExternalStore } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useWorkspaceScope, WorkspaceScopeProvider } from "@/features/workspace/hooks/workspace-scope";

export const DemoDataScopeProvider = WorkspaceScopeProvider;

export function useDemoState() {
  const realWorkspace = useWorkspaceScope();
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
