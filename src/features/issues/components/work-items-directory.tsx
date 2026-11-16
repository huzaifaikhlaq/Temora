"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { type Issue, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi, type Project } from "@/features/projects/api/client";
import { workspaceApi } from "@/features/workspace/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";
import type { WorkspaceMember } from "@/features/workspace/types";

const types: IssueType[] = ["task", "bug", "story", "epic"];
const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const typeLabels: Record<IssueType, string> = { task: "Task", bug: "Bug", story: "Story", epic: "Epic" };
const statusLabels: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To do", in_progress: "In progress", in_review: "In review", done: "Done" };
const priorityLabels: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const field = "h-9 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export function WorkItemsDirectory() {
  const activeWorkspaceId = useWorkspaceScope()?.workspaceId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type") ?? "all";
  const draftsOnly = searchParams.get("view") === "drafts";
  const type = (["all", ...types] as string[]).includes(rawType) ? rawType : "all";
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [projectRows, memberRows] = await Promise.all([
        projectApi.list(activeWorkspaceId),
        workspaceApi.members(activeWorkspaceId),
      ]);
      const availableProjects = projectRows.filter((project) => !project.archived_at);
      const workspaceIssues = await loadWorkspaceIssues(activeWorkspaceId, availableProjects);
      setProjects(availableProjects);
      setMembers(memberRows);
      setIssues(workspaceIssues.filter((issue) => !issue.archived_at));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Work items could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => issues.filter((issue) => {
    const project = projects.find((item) => item.id === issue.project_id);
    const content = `${issue.key} ${issue.title} ${issue.description} ${project?.name ?? ""}`.toLowerCase();
    return (type === "all" || issue.issue_type === type) &&
      (projectId === "all" || issue.project_id === projectId) &&
      (status === "all" || issue.status === status) &&
      (priority === "all" || issue.priority === priority) &&
      (assignee === "all" || (assignee === "unassigned" ? !issue.assignee_id : issue.assignee_id === assignee)) &&
      issue.is_draft === draftsOnly && content.includes(query.trim().toLowerCase());
  }), [issues, projects, type, projectId, status, priority, assignee, draftsOnly, query]);

  function selectType(nextType: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextType === "all") next.delete("type"); else next.set("type", nextType);
    router.replace(`/work-items${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  function selectDrafts(onlyDrafts: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    if (onlyDrafts) next.set("view", "drafts"); else next.delete("view");
    router.replace(`/work-items${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  function clearFilters() {
    setQuery(""); setProjectId("all"); setStatus("all"); setPriority("all"); setAssignee("all"); selectType("all");
  }

  return <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-8 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.13em] text-accent">Workspace / Work tracking</p><h1 className="text-3xl font-semibold tracking-tight">{draftsOnly ? "Drafts" : "Work Items"}</h1><p className="mt-2 text-sm text-muted">Search and track tasks, bugs, stories, and epics across your projects.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => selectDrafts(!draftsOnly)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-surface-low">{draftsOnly ? "Published Work" : `Drafts (${issues.filter((issue) => issue.is_draft).length})`}</button><Link href="/work-items/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong"><Icon name="add" size={17} />Create Work Item</Link></div>
    </header>

    <nav aria-label="Filter by work item type" className="flex gap-1 overflow-x-auto border-b border-border/60">
      {[["all", "All Work Items"], ["task", "Tasks"], ["bug", "Bugs"], ["story", "Stories"], ["epic", "Epics"]].map(([value, label]) => <button key={value} type="button" aria-current={type === value ? "page" : undefined} onClick={() => selectType(value)} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${type === value ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}>{label}</button>)}
    </nav>

    <section aria-label="Work item filters" className="grid gap-2 rounded-xl border border-border/70 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(145px,180px))_auto]">
      <label className="relative"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input className={`${field} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search key, title, or project" aria-label="Search work items" /></label>
      <select className={field} value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Filter by project"><option value="all">All projects</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <select className={field} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{statuses.map((item) => <option value={item} key={item}>{statusLabels[item]}</option>)}</select>
      <select className={field} value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority"><option value="all">All priorities</option>{priorities.map((item) => <option value={item} key={item}>{priorityLabels[item]}</option>)}</select>
      <select className={field} value={assignee} onChange={(event) => setAssignee(event.target.value)} aria-label="Filter by assignee"><option value="all">All assignees</option><option value="unassigned">Unassigned</option>{members.map((member) => <option value={member.user_id} key={member.id}>{member.user_id.slice(0, 8)}</option>)}</select>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-low disabled:opacity-50"><Icon name="refresh" size={16} />Refresh</button>
    </section>

    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm" aria-live="polite">
      {loading ? <div className="space-y-3 p-6"><div className="h-5 w-1/3 animate-pulse rounded bg-surface-high" /><div className="h-12 animate-pulse rounded bg-surface-low" /><div className="h-12 animate-pulse rounded bg-surface-low" /></div>
        : error ? <div className="p-10 text-center"><Icon name="cloud_off" size={30} className="text-red" /><h2 className="mt-3 font-semibold">Couldn’t load work items</h2><p className="mt-1 text-sm text-muted">{error}</p><button type="button" onClick={() => void load()} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Try again</button></div>
        : visible.length === 0 ? <div className="p-12 text-center"><Icon name="search_off" size={30} className="text-outline" /><h2 className="mt-3 font-semibold">{issues.length ? "No matching work items" : "No work items yet"}</h2><p className="mt-1 text-sm text-muted">{issues.length ? "Try changing your filters." : "Create the first work item to start tracking work."}</p>{issues.length ? <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-accent">Clear filters</button> : <Link className="mt-4 inline-flex font-semibold text-accent" href="/work-items/new">Create a work item <Icon name="arrow_forward" size={17} className="ml-1" /></Link>}</div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-left"><thead className="bg-surface-low text-[11px] font-semibold uppercase tracking-wider text-muted"><tr>{["Key", "Title", "Type", "Project", "Status", "Priority", "Assignee", "Points", "Due Date", "Updated"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{visible.map((issue) => { const project = projects.find((item) => item.id === issue.project_id); const member = members.find((item) => item.user_id === issue.assignee_id); const href = issue.is_draft ? `/work-items/new?draftId=${issue.id}&projectId=${issue.project_id}` : `/projects/${issue.project_id}/issues/${issue.id}`; return <tr key={issue.id} className="h-12 border-t border-border/50 transition hover:bg-surface-low/70"><td className="px-4 py-3"><Link href={href} className="font-mono text-xs text-accent hover:underline">{issue.key}</Link></td><td className="max-w-[320px] px-4 py-3"><Link href={href} className="block truncate text-sm font-medium hover:text-accent">{issue.title || "Untitled work item"}</Link></td><td className="px-4 py-3 text-sm text-muted">{typeLabels[issue.issue_type]}</td><td className="px-4 py-3 text-sm text-muted">{project?.name ?? "Project"}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium status-${issue.status}`}><i className="size-1.5 rounded-full bg-current" />{statusLabels[issue.status]}</span></td><td className={`px-4 py-3 text-sm priority-${issue.priority}`}>{priorityLabels[issue.priority]}</td><td className="px-4 py-3 text-xs text-muted">{member ? member.user_id.slice(0, 8) : issue.assignee_id ? issue.assignee_id.slice(0, 8) : "Unassigned"}</td><td className="px-4 py-3 text-center text-sm">{issue.story_points ?? "—"}</td><td className="px-4 py-3 text-xs text-muted">{issue.due_date ? new Date(`${issue.due_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td><td className="px-4 py-3 text-xs text-muted">{new Date(issue.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td></tr>; })}</tbody></table></div>}
    </section>
  </main>;
}
