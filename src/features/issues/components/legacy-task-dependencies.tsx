"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import type { Issue } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi } from "@/features/projects/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";

export function LegacyTaskDependencies({ taskId }: { taskId: string }) {
  const workspaceId = useWorkspaceScope()?.workspaceId;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!workspaceId) return;
      try {
        const projects = (await projectApi.list(workspaceId)).filter((project) => !project.archived_at);
        const issues = await loadWorkspaceIssues(workspaceId, projects);
        const match = issues.find((item) => !item.is_draft && !item.archived_at && (item.id === taskId || item.key.toLowerCase() === taskId.toLowerCase()));
        if (active) setIssue(match ?? null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Work item could not be loaded.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [workspaceId, taskId]);

  return <main className="mx-auto max-w-2xl p-8"><section className="rounded-xl border border-border bg-white p-8 text-center"><Icon name={loading ? "progress_activity" : error ? "cloud_off" : "account_tree"} className={loading ? "animate-spin text-accent" : "text-outline"} size={28} /><h1 className="mt-3 text-lg font-semibold">{loading ? "Loading work item…" : "Dependencies"}</h1><p className="mt-2 text-sm text-muted">{error || (issue ? "Dependency tracking is not available for Issue Service work items yet." : "This work item could not be found in the active workspace.")}</p>{issue && <Link href={`/projects/${issue.project_id}/issues/${issue.id}`} className="mt-4 inline-flex text-sm font-semibold text-accent">Open {issue.key}</Link>}</section></main>;
}
