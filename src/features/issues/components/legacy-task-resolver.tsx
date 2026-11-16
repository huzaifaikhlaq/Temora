"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { type Issue } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi } from "@/features/projects/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";

export function LegacyTaskResolver({ taskId }: { taskId: string }) {
  const router = useRouter();
  const activeWorkspaceId = useWorkspaceScope()?.workspaceId;
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function resolve() {
      if (!activeWorkspaceId) return;
      try {
        const projects = (await projectApi.list(activeWorkspaceId)).filter((project) => !project.archived_at);
        const issues = await loadWorkspaceIssues(activeWorkspaceId, projects);
        const match = issues.find((issue: Issue) => !issue.is_draft && !issue.archived_at && (issue.id === taskId || issue.key.toLowerCase() === taskId.toLowerCase()));
        if (match && active) router.replace(`/projects/${match.project_id}/issues/${match.id}`);
        else if (active) setError("This work item could not be found in the active workspace.");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "This work item could not be resolved.");
      }
    }
    void resolve();
    return () => { active = false; };
  }, [activeWorkspaceId, router, taskId]);

  return <main className="mx-auto max-w-2xl p-8 text-center"><Icon name={error ? "search_off" : "progress_activity"} className={error ? "text-outline" : "animate-spin text-accent"} size={28} /><h1 className="mt-3 text-lg font-semibold">{error ? "Work Item unavailable" : "Opening work item…"}</h1>{error && <><p className="mt-2 text-sm text-muted">{error}</p><button type="button" onClick={() => router.replace("/work-items")} className="mt-4 text-sm font-semibold text-accent">Back to Work Items</button></>}</main>;
}
