"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { authClient, type AuthUser } from "@/features/authentication/lib/auth-client";
import { issueApi, type Issue, type IssueStatus } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi, type Project } from "@/features/projects/api/client";
import { workspaceApi } from "@/features/workspace/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";

const issueTypes = ["task", "bug", "story", "epic"] as const;
const typeNames = { task: "Tasks", bug: "Bugs", story: "Stories", epic: "Epics" } as const;
const statusNames: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To do", in_progress: "In progress", in_review: "In review", done: "Done" };
const priorityNames = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" } as const;

export function WorkspaceOverview() {
  const scope = useWorkspaceScope();
  const workspaceId = scope?.workspaceId;
  const userId = scope?.userId;
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [workspace, identity, projectRows] = await Promise.all([
        workspaceApi.get(workspaceId),
        authClient.me(),
        projectApi.list(workspaceId),
      ]);
      const activeProjects = projectRows.filter((project) => !project.archived_at);
      const issueRows = await loadWorkspaceIssues(workspaceId, activeProjects);
      setWorkspaceName(workspace.name);
      setUser(identity.user);
      setProjects(activeProjects);
      setIssues(issueRows.filter((issue) => !issue.is_draft && !issue.archived_at));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace overview could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openIssues = useMemo(() => issues.filter((issue) => issue.status !== "done"), [issues]);
  const myOpen = useMemo(() => openIssues.filter((issue) => issue.assignee_id === userId), [openIssues, userId]);
  const overdue = useMemo(() => openIssues.filter((issue) => issue.due_date && issue.due_date < new Date().toISOString().slice(0, 10)), [openIssues]);
  const dueSoon = useMemo(() => openIssues.filter((issue) => issue.due_date && issue.due_date >= new Date().toISOString().slice(0, 10)).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")).slice(0, 5), [openIssues]);
  const recent = useMemo(() => [...issues].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6), [issues]);

  async function markDone(issue: Issue) {
    if (!workspaceId || updating) return;
    setUpdating(issue.id);
    setError("");
    try {
      const updated = await issueApi.update(workspaceId, issue.project_id, issue.id, { status: "done" });
      setIssues((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not update ${issue.key}.`);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            <span className="size-2 rounded-full bg-accent" />{workspaceName} · Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Good morning, {user?.full_name ?? "there"}</h1>
          <p className="mt-1 text-sm text-muted">Workspace snapshot for {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projects" className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm shadow-sm hover:bg-surface-high"><Icon name="folder_special" size={16} />Projects</Link>
          <Link href="/work-items/new" className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"><Icon name="add" size={17} />Create Work Item</Link>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red"><span>{error}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Projects" value={loading ? "—" : `${projects.length} active`} note="Current workspace" icon="folder_open" />
        <MetricCard label="Open Work Items" value={loading ? "—" : String(openIssues.length)} note="Across active projects" icon="task_alt" />
        <MetricCard label="My Active Work" value={loading ? "—" : String(myOpen.length)} note="Assigned to you" icon="assignment_ind" />
        <MetricCard label="Overdue Work" value={loading ? "—" : `${overdue.length} overdue`} note={overdue.length ? "Needs attention" : "No overdue items"} icon="warning" tone={overdue.length ? "red" : "green"} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <Panel>
            <PanelTitle icon={<Icon name="checklist" />} title="My Priority Work" trailing={<Link href="/my-work" className="text-xs font-semibold text-accent">View all →</Link>} />
            <div className="divide-y divide-surface-low">
              {loading ? <div className="space-y-3 py-2">{[1, 2, 3].map((item) => <div key={item} className="h-11 animate-pulse rounded bg-surface-low" />)}</div> : myOpen.slice(0, 5).length ? myOpen.slice(0, 5).map((issue) => <div key={issue.id} className="flex items-center gap-3 py-3">
                <button type="button" aria-label={`Mark ${issue.key} done`} disabled={updating !== null} onClick={() => void markDone(issue)} className="grid size-6 shrink-0 place-items-center rounded-md border border-border text-muted hover:border-green hover:text-green disabled:opacity-50">{updating === issue.id ? <Icon name="progress_activity" size={15} className="animate-spin" /> : <Icon name="check_box_outline_blank" size={16} />}</button>
                <div className="min-w-0 flex-1"><Link href={`/projects/${issue.project_id}/issues/${issue.id}`} className="font-mono text-xs font-semibold text-accent">{issue.key}</Link><Link href={`/projects/${issue.project_id}/issues/${issue.id}`} className="ml-2 truncate text-sm font-medium hover:text-accent">{issue.title}</Link></div>
                <span className={`hidden rounded-md px-2 py-1 text-xs font-medium priority-${issue.priority} sm:inline`}>{priorityNames[issue.priority]}</span><span className="hidden text-xs text-muted sm:inline">{statusNames[issue.status]}</span>
              </div>) : <p className="py-6 text-sm text-muted">{error ? "Your assigned work is unavailable." : "No open work items assigned to you."}</p>}
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Active Projects Progress" trailing={<Link href="/projects" className="text-xs font-semibold text-accent">All projects →</Link>} />
            <p className="-mt-3 mb-4 text-sm text-muted">Project status and work item counts from this workspace.</p>
            <div className="space-y-3">
              {loading ? <div className="h-24 animate-pulse rounded-xl bg-surface-low" /> : projects.slice(0, 5).map((project) => {
                const projectOpen = openIssues.filter((issue) => issue.project_id === project.id).length;
                return <article key={project.id} className="rounded-xl bg-surface-low p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent" /><Link href={`/projects/${project.id}`} className="font-semibold hover:text-accent">{project.name}</Link><span className="rounded bg-surface-high px-2 py-0.5 font-mono text-[10px] text-muted">{project.category}</span></div><span className="font-mono text-xs font-semibold">{project.progress}% · {project.status.replace("_", " ")}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-accent" style={{ width: `${project.progress}%` }} /></div>
                  <div className="mt-2 flex justify-between text-xs text-muted"><span className="font-mono">{project.key}</span><span>{projectOpen} open work items</span></div>
                </article>;
              })}
              {!loading && !projects.length && <p className="py-5 text-sm text-muted">No active projects in this workspace.</p>}
            </div>
          </Panel>
        </div>

        <div className="space-y-5 xl:col-span-5">
          <Panel>
            <PanelTitle icon={<Icon name="calendar_today" />} title="Upcoming Due Dates" trailing={<Link href="/calendar" className="text-xs font-semibold text-accent">Calendar →</Link>} />
            {loading ? <div className="h-28 animate-pulse rounded-lg bg-surface-low" /> : dueSoon.length ? <div className="space-y-2">{dueSoon.map((issue) => <Link key={issue.id} href={`/projects/${issue.project_id}/issues/${issue.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface-low px-3 py-2.5 hover:bg-surface-high"><span className="min-w-0"><span className="mr-2 font-mono text-[11px] text-accent">{issue.key}</span><span className="text-sm font-medium">{issue.title}</span></span><span className="shrink-0 text-xs text-muted">{new Date(`${issue.due_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></Link>)}</div> : <p className="py-4 text-sm text-muted">No upcoming due dates for open work items.</p>}
          </Panel>
          <Panel>
            <PanelTitle title="Work Item Types" trailing={<Link href="/work-items" className="text-xs font-semibold text-accent">Work Items →</Link>} />
            <div className="space-y-3">{issueTypes.map((type) => { const count = issues.filter((issue) => issue.issue_type === type).length; const share = issues.length ? Math.round(count / issues.length * 100) : 0; return <div key={type}><div className="mb-1 flex justify-between text-sm"><span>{typeNames[type]}</span><span className="font-mono text-xs text-muted">{loading ? "—" : count}</span></div><div className="h-1.5 rounded-full bg-surface-high"><div className="h-full rounded-full bg-accent" style={{ width: loading ? "0%" : `${share}%` }} /></div></div>; })}</div>
          </Panel>
          <Panel>
            <PanelTitle icon={<Icon name="history" />} title="Recently Updated" trailing={<Link href="/work-items" className="text-xs font-semibold text-accent">View all →</Link>} />
            {loading ? <div className="h-24 animate-pulse rounded-lg bg-surface-low" /> : recent.length ? <ol className="space-y-3">{recent.map((issue) => <li key={issue.id} className="flex items-start gap-3"><Icon name={issue.issue_type === "bug" ? "bug_report" : issue.issue_type === "epic" ? "flag" : "check_box"} size={17} className="mt-0.5 text-accent" /><div className="min-w-0"><Link href={`/projects/${issue.project_id}/issues/${issue.id}`} className="font-mono text-[11px] text-accent">{issue.key}</Link><Link href={`/projects/${issue.project_id}/issues/${issue.id}`} className="ml-2 text-sm font-medium hover:text-accent">{issue.title}</Link><span className="ml-2 text-[11px] text-muted">{new Date(issue.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div></li>)}</ol> : <p className="py-3 text-sm text-muted">Work item updates will appear here.</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
