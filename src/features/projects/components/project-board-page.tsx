"use client";

import { KanbanBoard } from "@/features/boards/components/kanban-board";
import { ProjectEmptyState } from "@/features/projects/components/project-empty-state";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

export function ProjectBoardPage({ projectId }: { projectId: string }) {
  const state=useDemoState();
  const project=state.projects.find(item=>item.id===projectId && item.workspaceId===state.activeWorkspaceId);
  const hasIssues=state.issues.some(issue=>issue.projectId===projectId && issue.workspaceId===state.activeWorkspaceId);
  if(!project)return <ProjectEmptyState projectId={projectId}/>;
  return hasIssues?<KanbanBoard projectId={projectId}/>:<ProjectEmptyState projectId={projectId}/>;
}
