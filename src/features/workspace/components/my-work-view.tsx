"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { authClient, type AuthUser } from "@/features/authentication/lib/auth-client";
import { issueApi, type Issue, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi, type Project } from "@/features/projects/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";

type WorkTab = "assigned" | "created" | "completed";
type WorkView = "list" | "board" | "calendar";

const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const typeLabels: Record<IssueType, string> = { task: "Task", bug: "Bug", story: "Story", epic: "Epic" };
const statusLabels: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To do", in_progress: "In Progress", in_review: "In Review", done: "Done" };
const priorityLabels: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const inputClass = "h-10 rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

function issueHref(issue: Issue) {
  return `/projects/${issue.project_id}/issues/${issue.id}`;
}

function shortDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function MyWorkView() {
  const scope = useWorkspaceScope();
  const activeWorkspaceId = scope?.workspaceId;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<IssueType | "all">("all");
  const [projectId, setProjectId] = useState("all");
  const [priority, setPriority] = useState<IssuePriority | "all">("all");
  const [tab, setTab] = useState<WorkTab>("assigned");
  const [view, setView] = useState<WorkView>("list");

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [identity, projectRows] = await Promise.all([authClient.me(), projectApi.list(activeWorkspaceId)]);
      const availableProjects = projectRows.filter((project) => !project.archived_at);
      const rows = await loadWorkspaceIssues(activeWorkspaceId, availableProjects);
      setUser(identity.user);
      setProjects(availableProjects);
      setIssues(rows.filter((issue) => !issue.is_draft && !issue.archived_at));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your work could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const assigned = useMemo(() => issues.filter((issue) => issue.assignee_id === user?.id), [issues, user?.id]);
  const created = useMemo(() => issues.filter((issue) => issue.reporter_id === user?.id), [issues, user?.id]);
  const completed = useMemo(() => assigned.filter((issue) => issue.status === "done"), [assigned]);
  const tabItems = tab === "created" ? created : tab === "completed" ? completed : assigned;
  const active = assigned.filter((issue) => issue.status !== "done");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = localDateKey(today);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndIso = localDateKey(weekEnd);
  const overdue = active.filter((issue) => issue.due_date && issue.due_date < todayIso);
  const dueSoon = active.filter((issue) => issue.due_date && issue.due_date >= todayIso && issue.due_date <= weekEndIso);
  const remainingPoints = active.reduce((sum, issue) => sum + (issue.story_points ?? 0), 0);

  const visible = useMemo(() => tabItems.filter((issue) => {
    const project = projects.find((item) => item.id === issue.project_id);
    const content = `${issue.key} ${issue.title} ${project?.name ?? ""}`.toLowerCase();
    return (type === "all" || issue.issue_type === type) &&
      (projectId === "all" || issue.project_id === projectId) &&
      (priority === "all" || issue.priority === priority) && content.includes(query.trim().toLowerCase());
  }).sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31")), [tabItems, projects, type, projectId, priority, query]);

  async function markDone(issue: Issue) {
    if (!activeWorkspaceId || updating) return;
    setUpdating(issue.id);
    setError("");
    try {
      const changed = await issueApi.update(activeWorkspaceId, issue.project_id, issue.id, { status: issue.status === "done" ? "to_do" : "done" });
      setIssues((current) => current.map((item) => item.id === changed.id ? changed : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not update ${issue.key}.`);
    } finally {
      setUpdating(null);
    }
  }

  const tabs: { id: WorkTab; label: string; count: number }[] = [
    { id: "assigned", label: "Assigned to me", count: assigned.length },
    { id: "created", label: "Created by me", count: created.length },
    { id: "completed", label: "Completed", count: completed.length },
  ];

  return <main className="mx-auto max-w-[1700px] space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f7f6ff] px-5 py-5 sm:px-7">
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm"><Icon name="assignment_ind" size={24} /></span>
        <div className="min-w-0"><h1 className="text-3xl font-semibold tracking-tight">My Work <span className="ml-1 rounded-full bg-accent/10 px-2.5 py-1 align-middle font-mono text-sm text-accent">{active.length} Active</span></h1><p className="mt-1 text-sm text-muted">Personal action queue for {user?.full_name ?? "you"}</p></div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-[#e9e8f5] p-1" aria-label="Work display">
        {([ ["list", "List", "format_list_bulleted"], ["board", "Board", "view_kanban"], ["calendar", "Calendar", "calendar_month"] ] as const).map(([value, label, icon]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${view === value ? "bg-white text-accent shadow-sm" : "text-muted hover:text-foreground"}`}><Icon name={icon} size={18} />{label}</button>)}
        <Link href="/work-items/new" className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"><Icon name="add_task" size={18} />New Work Item</Link>
      </div>
    </header>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red"><span>{error}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button></div>}

    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-1">
      <nav aria-label="My work views" className="flex gap-1 overflow-x-auto">{tabs.map((item) => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm ${tab === item.id ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}>{item.label}<span className={`rounded-full px-2 py-0.5 font-mono text-xs ${tab === item.id ? "bg-accent text-white" : "bg-surface-high text-muted"}`}>{item.count}</span></button>)}</nav>
      <p className="mb-2 flex items-center gap-2 font-mono text-xs tracking-wide text-muted"><Icon name="event" size={16} />{dueSoon.length} due in the next 7 days</p>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Overdue", String(overdue.length), "warning", "text-red"], ["Due in 7 days", String(dueSoon.length), "schedule", "text-accent"], ["Active work", String(active.length), "pending_actions", "text-green"], ["Remaining points", `${remainingPoints} pts`, "bolt", "text-accent"]].map(([label, value, icon, tone]) => <section key={label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-white p-4 shadow-sm"><span className={`grid size-10 place-items-center rounded-lg bg-surface-low ${tone}`}><Icon name={icon} size={20} /></span><div><p className="text-xs text-muted">{label}</p><p className="mt-0.5 text-xl font-semibold tracking-tight">{loading ? "—" : value}</p></div></section>)}
    </div>

    <section className="grid gap-2 rounded-xl border border-border/50 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_200px_200px]">
      <label className="relative"><Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input aria-label="Search my work" className={`${inputClass} w-full pl-10`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by title, tag, or key..." /></label>
      <select aria-label="Filter by project" className={inputClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">Project: All ({projects.length})</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select>
      <select aria-label="Filter by work item type" className={inputClass} value={type} onChange={(event) => setType(event.target.value as IssueType | "all")}><option value="all">Type: All</option>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      <select aria-label="Filter by priority" className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value as IssuePriority | "all")}><option value="all">Priority: All</option>{priorities.map((value) => <option value={value} key={value}>{priorityLabels[value]}</option>)}</select>
    </section>

    {loading ? <div className="space-y-3 rounded-xl border border-border bg-white p-6"><div className="h-5 w-1/3 animate-pulse rounded bg-surface-high" /><div className="h-12 animate-pulse rounded bg-surface-low" /><div className="h-12 animate-pulse rounded bg-surface-low" /></div>
      : view === "board" ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">{statuses.map((status) => { const rows = visible.filter((issue) => issue.status === status); return <section key={status} className="min-h-56 rounded-xl bg-[#f0effa] p-3"><h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{statusLabels[status]}<span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted">{rows.length}</span></h2><div className="space-y-2">{rows.map((issue) => <IssueCard key={issue.id} issue={issue} project={projects.find((project) => project.id === issue.project_id)?.name} updating={updating === issue.id} onToggle={() => void markDone(issue)} />)}</div></section>; })}</div>
      : view === "calendar" ? <section className="rounded-xl border border-border bg-white p-4 shadow-sm"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon name="calendar_month" size={18} className="text-accent" />Scheduled work</h2>{visible.filter((issue) => issue.due_date).length ? <div className="divide-y divide-border/50">{visible.filter((issue) => issue.due_date).map((issue) => <IssueRow key={issue.id} issue={issue} project={projects.find((project) => project.id === issue.project_id)?.name} updating={updating === issue.id} onToggle={() => void markDone(issue)} />)}</div> : <EmptyState hasError={Boolean(error)} hasItems={tabItems.length > 0} onRefresh={() => void load()} />}</section>
      : <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm" aria-live="polite">{visible.length === 0 ? <EmptyState hasError={Boolean(error)} hasItems={tabItems.length > 0} onRefresh={() => void load()} /> : <div className="divide-y divide-border/50">{groupedRows(visible, todayIso, weekEndIso).map(({ title, icon, rows, tone }) => rows.length > 0 && <div key={title}><h2 className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${tone}`}><Icon name={icon} size={18} />{title}<span className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-xs">{rows.length}</span></h2>{rows.map((issue) => <IssueRow key={issue.id} issue={issue} project={projects.find((project) => project.id === issue.project_id)?.name} updating={updating === issue.id} onToggle={() => void markDone(issue)} />)}</div>)}</div>}</section>}
  </main>;
}

function groupedRows(issues: Issue[], today: string, weekEnd: string) {
  return [
    { title: "Overdue", icon: "warning", tone: "bg-red/10 text-red", rows: issues.filter((issue) => issue.status !== "done" && issue.due_date && issue.due_date < today) },
    { title: "Due today & this week", icon: "calendar_today", tone: "bg-accent/10 text-accent", rows: issues.filter((issue) => issue.status !== "done" && issue.due_date && issue.due_date >= today && issue.due_date <= weekEnd) },
    { title: "Upcoming", icon: "event_upcoming", tone: "bg-surface-low text-foreground", rows: issues.filter((issue) => issue.status !== "done" && issue.due_date && issue.due_date > weekEnd) },
    { title: "No due date", icon: "schedule", tone: "bg-surface-low text-muted", rows: issues.filter((issue) => !issue.due_date) },
    { title: "Completed", icon: "task_alt", tone: "bg-green/10 text-green", rows: issues.filter((issue) => issue.status === "done") },
  ];
}

function IssueCard({ issue, project, updating, onToggle }: { issue: Issue; project?: string; updating: boolean; onToggle: () => void }) {
  return <article className="rounded-lg border border-border/60 bg-white p-3 shadow-sm"><Link href={issueHref(issue)} className="block text-sm font-semibold leading-5 hover:text-accent">{issue.title}</Link><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted"><Link href={issueHref(issue)} className="font-mono text-accent">{issue.key}</Link><span>·</span><span>{project ?? "Project"}</span></div><div className="mt-3 flex items-center justify-between"><span className={`rounded-md px-2 py-1 text-xs font-medium priority-${issue.priority}`}>{priorityLabels[issue.priority]}</span><button type="button" onClick={onToggle} disabled={updating} aria-label={issue.status === "done" ? `Reopen ${issue.key}` : `Mark ${issue.key} done`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-low hover:text-accent disabled:opacity-50"><Icon name={updating ? "progress_activity" : issue.status === "done" ? "check_circle" : "radio_button_unchecked"} size={18} className={updating ? "animate-spin" : ""} /></button></div></article>;
}

function IssueRow({ issue, project, updating, onToggle }: { issue: Issue; project?: string; updating: boolean; onToggle: () => void }) {
  return <div className="grid grid-cols-[32px_minmax(0,1fr)_minmax(90px,160px)_auto_auto] items-center gap-3 px-4 py-3 transition hover:bg-[#f7f6ff] max-sm:grid-cols-[28px_minmax(0,1fr)_auto]"><button type="button" aria-label={issue.status === "done" ? `Reopen ${issue.key}` : `Mark ${issue.key} done`} disabled={updating} onClick={onToggle} className="grid size-7 place-items-center rounded-md text-muted hover:bg-white hover:text-green disabled:opacity-50"><Icon name={updating ? "progress_activity" : issue.status === "done" ? "check_circle" : "check_box_outline_blank"} size={18} className={updating ? "animate-spin" : ""} /></button><div className="min-w-0"><Link href={issueHref(issue)} className="block truncate text-sm font-semibold hover:text-accent">{issue.title}</Link><div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted"><Link href={issueHref(issue)} className="shrink-0 font-mono text-accent">{issue.key}</Link><span>·</span><span className="truncate">{project ?? "Project"}</span><span>·</span><span>{typeLabels[issue.issue_type]}</span></div></div><span className={`max-sm:hidden rounded-md px-2 py-1 text-xs font-medium status-${issue.status}`}>{statusLabels[issue.status]}</span><span className={`max-sm:hidden text-xs priority-${issue.priority}`}>{priorityLabels[issue.priority]}</span><span className="text-right text-xs font-mono text-muted">{shortDate(issue.due_date)}</span></div>;
}

function EmptyState({ hasError, hasItems, onRefresh }: { hasError: boolean; hasItems: boolean; onRefresh: () => void }) {
  return <div className="p-12 text-center"><Icon name={hasError ? "cloud_off" : "check_circle"} size={30} className="text-outline" /><h2 className="mt-3 font-semibold">{hasError ? "Your work is unavailable" : hasItems ? "No matching work items" : "Nothing here yet"}</h2><p className="mt-1 text-sm text-muted">{hasError ? "Retry when the workspace service is available." : hasItems ? "Try changing the selected filters." : "Work items will appear here as they are assigned or created."}</p><button type="button" onClick={onRefresh} className="mt-4 text-sm font-semibold text-accent">Refresh</button></div>;
}
