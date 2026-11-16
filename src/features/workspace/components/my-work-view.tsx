"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { authClient, type AuthUser } from "@/features/authentication/lib/auth-client";
import { issueApi, type Issue, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi, type Project } from "@/features/projects/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";

const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const typeLabels: Record<IssueType, string> = { task: "Task", bug: "Bug", story: "Story", epic: "Epic" };
const statusLabels: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To do", in_progress: "In progress", in_review: "In review", done: "Done" };
const priorityLabels: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const field = "h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export function MyWorkView() {
  const activeWorkspaceId = useWorkspaceScope()?.workspaceId;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true); setError("");
    try {
      const [identity, projectRows] = await Promise.all([authClient.me(), projectApi.list(activeWorkspaceId)]);
      const availableProjects = projectRows.filter((project) => !project.archived_at);
      const rows = await loadWorkspaceIssues(activeWorkspaceId, availableProjects);
      setUser(identity.user);
      setProjects(availableProjects);
      setIssues(rows.filter((issue) => !issue.is_draft && !issue.archived_at));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your work could not be loaded.");
    } finally { setLoading(false); }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const assigned = useMemo(() => issues.filter((issue) => issue.assignee_id === user?.id), [issues, user?.id]);
  const visible = useMemo(() => assigned.filter((issue) => {
    const project = projects.find((item) => item.id === issue.project_id);
    const content = `${issue.key} ${issue.title} ${project?.name ?? ""}`.toLowerCase();
    return (type === "all" || issue.issue_type === type) &&
      (projectId === "all" || issue.project_id === projectId) &&
      (status === "all" || issue.status === status) &&
      (priority === "all" || issue.priority === priority) &&
      content.includes(query.trim().toLowerCase());
  }), [assigned, projects, type, projectId, status, priority, query]);
  const open = assigned.filter((issue) => issue.status !== "done");
  const overdue = open.filter((issue) => issue.due_date && issue.due_date < new Date().toISOString().slice(0, 10));

  async function markDone(issue: Issue) {
    if (!activeWorkspaceId || updating) return;
    setUpdating(issue.id); setError("");
    try {
      const changed = await issueApi.update(activeWorkspaceId, issue.project_id, issue.id, { status: "done" });
      setIssues((current) => current.map((item) => item.id === changed.id ? changed : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not update ${issue.key}.`);
    } finally { setUpdating(null); }
  }

  return <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-accent"><Icon name="assignment_ind" size={16} />Personal work queue</p><h1 className="text-3xl font-semibold tracking-tight">My Work <span className="ml-1 rounded-full bg-surface-high px-2.5 py-1 align-middle font-mono text-sm">{open.length} Active</span></h1><p className="mt-1 text-sm text-muted">Work items assigned to {user?.full_name ?? "you"} in the active workspace.</p></div>
      <Link href="/work-items/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"><Icon name="add" size={17} />Create Work Item</Link>
    </header>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red"><span>{error}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[ ["Assigned", String(assigned.length), "assignment_ind"], ["Active", String(open.length), "pending_actions"], ["Overdue", String(overdue.length), "warning"], ["Open story points", `${open.reduce((sum, issue) => sum + (issue.story_points ?? 0), 0)} pts`, "bolt"] ].map(([label, value, icon]) => <section key={label} className="rounded-xl border border-border/70 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs text-muted"><span>{label}</span><Icon name={icon} size={17} /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{loading ? "—" : value}</p></section>)}
    </div>

    <nav aria-label="Filter by work item type" className="flex gap-1 overflow-x-auto border-b border-border/60">{[["all", "All Work"], ["task", "Tasks"], ["bug", "Bugs"], ["story", "Stories"], ["epic", "Epics"]].map(([value, label]) => <button type="button" key={value} aria-pressed={type === value} onClick={() => setType(value)} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${type === value ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}>{label}</button>)}</nav>

    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="grid gap-2 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,190px))]">
        <label className="relative"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input aria-label="Search my work" className={`${field} w-full pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or key" /></label>
        <select aria-label="Filter by project" className={field} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">All projects</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select>
        <select aria-label="Filter by status" className={field} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((item) => <option value={item} key={item}>{statusLabels[item]}</option>)}</select>
        <select aria-label="Filter by priority" className={field} value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option>{priorities.map((item) => <option value={item} key={item}>{priorityLabels[item]}</option>)}</select>
      </div>
      {loading ? <div className="space-y-3 p-6"><div className="h-5 w-1/3 animate-pulse rounded bg-surface-high" /><div className="h-12 animate-pulse rounded bg-surface-low" /><div className="h-12 animate-pulse rounded bg-surface-low" /></div>
        : visible.length === 0 ? <div className="p-12 text-center"><Icon name={error ? "cloud_off" : "check_circle"} size={30} className="text-outline" /><h2 className="mt-3 font-semibold">{error ? "Your work is unavailable" : assigned.length ? "No matching work items" : "Nothing assigned yet"}</h2><p className="mt-1 text-sm text-muted">{error ? "Retry when the workspace service is available." : assigned.length ? "Try changing these filters." : "Work items assigned to you will appear here."}</p><button type="button" onClick={() => void load()} className="mt-4 text-sm font-semibold text-accent">Refresh</button></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead className="bg-surface-low text-[11px] font-semibold uppercase tracking-wider text-muted"><tr>{["", "Key", "Title", "Type", "Project", "Status", "Priority", "Due date", "Points"].map((name) => <th key={name} className="px-4 py-3">{name}</th>)}</tr></thead><tbody>{visible.map((issue) => { const project = projects.find((item) => item.id === issue.project_id); return <tr key={issue.id} className="h-12 border-t border-border/50 hover:bg-surface-low/70"><td className="px-4 py-2"><button type="button" aria-label={`Mark ${issue.key} done`} disabled={issue.status === "done" || updating !== null} onClick={() => void markDone(issue)} className="grid size-6 place-items-center rounded-md border border-border text-muted hover:border-green hover:text-green disabled:opacity-40">{updating === issue.id ? <Icon name="progress_activity" size={15} className="animate-spin" /> : <Icon name={issue.status === "done" ? "check" : "check_box_outline_blank"} size={16} />}</button></td><td className="px-4 py-2 font-mono text-xs"><Link className="text-accent hover:underline" href={`/projects/${issue.project_id}/issues/${issue.id}`}>{issue.key}</Link></td><td className="max-w-[320px] px-4 py-2"><Link className="block truncate text-sm font-medium hover:text-accent" href={`/projects/${issue.project_id}/issues/${issue.id}`}>{issue.title}</Link></td><td className="px-4 py-2 text-sm text-muted">{typeLabels[issue.issue_type]}</td><td className="px-4 py-2 text-sm text-muted">{project?.name ?? "Project"}</td><td className="px-4 py-2 text-sm">{statusLabels[issue.status]}</td><td className={`px-4 py-2 text-sm priority-${issue.priority}`}>{priorityLabels[issue.priority]}</td><td className="px-4 py-2 text-xs text-muted">{issue.due_date ? new Date(`${issue.due_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td><td className="px-4 py-2 text-center text-sm">{issue.story_points ?? "—"}</td></tr>; })}</tbody></table></div>}
    </section>
  </main>;
}
