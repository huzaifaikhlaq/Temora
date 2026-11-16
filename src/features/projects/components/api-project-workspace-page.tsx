"use client";

import { WorkItemsDirectory } from "@/features/issues/components/work-items-directory";

export function ApiProjectWorkspacePage({ projectId }: { workspaceId: string; projectId: string }) {
  return <WorkItemsDirectory scopedProjectId={projectId} />;
}
