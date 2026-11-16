"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { issueApi, type Issue, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { loadWorkspaceIssues } from "@/features/issues/lib/work-items";
import { projectApi, type Project } from "@/features/projects/api/client";
import { workspaceApi } from "@/features/workspace/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";
import type { WorkspaceMember } from "@/features/workspace/types";

const types: IssueType[] = ["story", "bug", "task", "epic"];
const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const typeLabels: Record<IssueType, string> = { task: "Task", bug: "Bug", story: "Story", epic: "Epic" };
const statusLabels: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To Do", in_progress: "In Progress", in_review: "In Review", done: "Done" };
const priorityLabels: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const field = "h-10 rounded-lg border border-border bg-[#f3f2ff] px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";
const pageSize = 25;

export function WorkItemsDirectory({ scopedProjectId }: { scopedProjectId?: string } = {}) {
  const activeWorkspaceId = useWorkspaceScope()?.workspaceId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type") ?? "all";
  const draftsOnly = !scopedProjectId && searchParams.get("view") === "drafts";
  const type = (["all", ...types] as string[]).includes(rawType) ? rawType : "all";
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [view, setView] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<IssueStatus>("in_progress");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);
  const effectiveProjectId = scopedProjectId ?? projectId;
  const selectedProject = projects.find((project) => project.id === effectiveProjectId);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [projectRows, memberRows, workspace] = await Promise.all([
        projectApi.list(activeWorkspaceId),
        workspaceApi.members(activeWorkspaceId).catch(() => [] as WorkspaceMember[]),
        workspaceApi.get(activeWorkspaceId).catch(() => ({ name: "Workspace" })),
      ]);
      const availableProjects = projectRows.filter((project) => !project.archived_at);
      const rows = await loadWorkspaceIssues(activeWorkspaceId, availableProjects);
      setProjects(availableProjects);
      setMembers(memberRows);
      setWorkspaceName(workspace.name);
      setIssues(rows.filter((issue) => !issue.archived_at));
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
    const matchesView = view === "open" ? issue.status !== "done" : view === "urgent" ? issue.priority === "urgent" || issue.priority === "high" : view === "done" ? issue.status === "done" : true;
    return issue.is_draft === draftsOnly &&
      (type === "all" || issue.issue_type === type) &&
      (effectiveProjectId === "all" || issue.project_id === effectiveProjectId) &&
      (status === "all" || issue.status === status) &&
      (priority === "all" || issue.priority === priority) &&
      (assignee === "all" || (assignee === "unassigned" ? !issue.assignee_id : issue.assignee_id === assignee)) &&
      matchesView && content.includes(query.trim().toLowerCase());
  }), [issues, projects, type, effectiveProjectId, status, priority, assignee, draftsOnly, view, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function routeWithParams(next: URLSearchParams) {
    const basePath = scopedProjectId ? `/projects/${scopedProjectId}` : "/work-items";
    router.replace(`${basePath}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  function selectType(nextType: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextType === "all") next.delete("type"); else next.set("type", nextType);
    routeWithParams(next);
  }

  function selectDrafts(onlyDrafts: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    if (onlyDrafts) next.set("view", "drafts"); else next.delete("view");
    routeWithParams(next);
  }

  function clearFilters() {
    setQuery("");
    if (!scopedProjectId) setProjectId("all");
    setStatus("all");
    setPriority("all");
    setAssignee("all");
    setView("all");
    setSelected([]);
    selectType("all");
  }

  function exportCsv() {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [["Key", "Title", "Type", "Project", "Status", "Priority", "Assignee", "Reporter", "Story points", "Due date", "Updated"].map(quote).join(","), ...visible.map((issue) => {
      const project = projects.find((item) => item.id === issue.project_id);
      return [issue.key, issue.title, typeLabels[issue.issue_type], project?.name ?? "", statusLabels[issue.status], priorityLabels[issue.priority], issue.assignee_id ?? "Unassigned", issue.reporter_id, issue.story_points ?? "", issue.due_date ?? "", issue.updated_at].map(quote).join(",");
    })];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedProject?.key ?? "work-items"}-issues.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function updateSelected() {
    if (!activeWorkspaceId || selected.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    try {
      const changed = await Promise.all(selected.map((id) => {
        const issue = issues.find((item) => item.id === id);
        return issue ? issueApi.update(activeWorkspaceId, issue.project_id, issue.id, { status: bulkStatus }) : Promise.resolve(null);
      }));
      setIssues((current) => current.map((item) => changed.find((row) => row?.id === item.id) ?? item));
      setSelected([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Some selected work items could not be updated.");
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  return <main className="mx-auto max-w-[1700px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 inline-flex items-center gap-2 rounded-md bg-accent/10 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent"><Icon name="folder_open" size={15} />{selectedProject ? `${selectedProject.key} · ${selectedProject.name}` : `Tenant: ${workspaceName || "Workspace"}`}</p><h1 className="text-3xl font-semibold tracking-tight">{draftsOnly ? "Draft Issues" : "All Issues Directory"}</h1><p className="mt-1 max-w-2xl text-sm text-muted">Search, filter, and manage work items{selectedProject ? ` in ${selectedProject.name}` : " across your workspace projects"}.</p></div>
      <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="issue-view">Issue view</label><select id="issue-view" className={`${field} min-w-48`} value={view} onChange={(event) => setView(event.target.value)}><option value="all">View: All issues</option><option value="open">View: Open issues</option><option value="urgent">View: High priority</option><option value="done">View: Completed issues</option></select><button type="button" onClick={exportCsv} disabled={visible.length === 0} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-surface-low disabled:opacity-50"><Icon name="download" size={17} />Export CSV</button><Link href={`/work-items/new${effectiveProjectId !== "all" ? `?projectId=${effectiveProjectId}` : ""}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"><Icon name="add" size={17} />Create Issue</Link></div>
    </header>

    <nav aria-label="Filter by work item type" className="flex gap-1 overflow-x-auto border-b border-border/60">{[["all", "All Issues"], ["story", "Stories"], ["bug", "Bugs"], ["task", "Tasks"], ["epic", "Epics"]].map(([value, label]) => <button key={value} type="button" aria-current={type === value ? "page" : undefined} onClick={() => selectType(value)} className={`shrink-0 border-b-2 px-4 py-2.5 text-sm ${type === value ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}>{label}</button>)}</nav>

    <section aria-label="Issue filters" className="space-y-3 rounded-2xl border border-border/50 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-2 xl:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(145px,190px))]">
        <label className="relative"><Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input className={`${field} h-11 w-full pl-10`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues by keyword, key, or summary..." aria-label="Search issues" /></label>
        {!scopedProjectId && <select className={`${field} h-11`} value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Filter by project"><option value="all">Project: All Projects ({projects.length})</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>}
        <select className={`${field} h-11`} value={type} onChange={(event) => selectType(event.target.value)} aria-label="Filter by type"><option value="all">Type: All</option>{types.map((item) => <option value={item} key={item}>{typeLabels[item]}</option>)}</select>
        <select className={`${field} h-11`} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">Status: All</option>{statuses.map((item) => <option value={item} key={item}>{statusLabels[item]}</option>)}</select>
        <select className={`${field} h-11`} value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority"><option value="all">Priority: All</option>{priorities.map((item) => <option value={item} key={item}>{priorityLabels[item]}</option>)}</select>
        <select className={`${field} h-11`} value={assignee} onChange={(event) => setAssignee(event.target.value)} aria-label="Filter by assignee"><option value="all">Assignee: Anyone</option><option value="unassigned">Unassigned</option>{members.map((member) => <option value={member.user_id} key={member.id}>Member {member.user_id.slice(0, 8)}</option>)}</select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-[#f3f2ff] px-2.5 py-1.5 text-muted">{visible.length} matching issues</span>{selectedProject && <span className="rounded-md bg-[#f3f2ff] px-2.5 py-1.5 text-accent">Project: {selectedProject.name}</span>}{type !== "all" && <span className="rounded-md bg-accent/10 px-2.5 py-1.5 text-accent">Type: {typeLabels[type as IssueType]}</span>}{status !== "all" && <span className="rounded-md bg-accent/10 px-2.5 py-1.5 text-accent">Status: {statusLabels[status as IssueStatus]}</span>}{priority !== "all" && <span className="rounded-md bg-accent/10 px-2.5 py-1.5 text-accent">Priority: {priorityLabels[priority as IssuePriority]}</span>}</div><div className="flex gap-3"><button type="button" onClick={() => selectDrafts(!draftsOnly)} className="text-sm font-medium text-accent hover:underline">{draftsOnly ? "Published issues" : `Drafts (${issues.filter((issue) => issue.is_draft).length})`}</button><button type="button" onClick={() => void load()} disabled={loading} className="text-sm font-medium text-muted hover:text-accent disabled:opacity-50">Refresh</button><button type="button" onClick={clearFilters} className="text-sm font-medium text-accent hover:underline">Clear filters</button></div></div>
    </section>

    {selected.length > 0 && <section className="flex flex-wrap items-center gap-3 rounded-xl bg-[#191923] px-4 py-3 text-white shadow-lg" aria-live="polite"><span className="mr-auto font-semibold">{selected.length} {selected.length === 1 ? "issue" : "issues"} selected</span><label className="flex items-center gap-2 text-sm"><span className="text-white/70">Change status</span><select className="h-9 rounded-lg border-0 bg-white/10 px-2 text-white" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as IssueStatus)}>{statuses.map((item) => <option className="text-foreground" key={item} value={item}>{statusLabels[item]}</option>)}</select></label><button type="button" disabled={bulkBusy} onClick={() => void updateSelected()} className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold disabled:opacity-50">Apply</button><button type="button" onClick={() => setSelected([])} className="h-9 rounded-lg px-3 text-sm text-white/70 hover:bg-white/10">Clear selection</button></section>}

    <section className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm" aria-live="polite">
      {loading ? <div className="space-y-3 p-6"><div className="h-5 w-1/3 animate-pulse rounded bg-surface-high" /><div className="h-12 animate-pulse rounded bg-surface-low" /><div className="h-12 animate-pulse rounded bg-surface-low" /></div>
        : error ? <div className="p-10 text-center"><Icon name="cloud_off" size={30} className="text-red" /><h2 className="mt-3 font-semibold">Could not load work items</h2><p className="mt-1 text-sm text-muted">{error}</p><button type="button" onClick={() => void load()} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Try again</button></div>
        : visible.length === 0 ? <div className="p-12 text-center"><Icon name="search_off" size={30} className="text-outline" /><h2 className="mt-3 font-semibold">{issues.length ? "No matching work items" : "No work items yet"}</h2><p className="mt-1 text-sm text-muted">{issues.length ? "Try changing your filters." : "Create the first work item to start tracking work."}</p>{issues.length ? <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-accent">Clear filters</button> : <Link className="mt-4 inline-flex font-semibold text-accent" href={`/work-items/new${effectiveProjectId !== "all" ? `?projectId=${effectiveProjectId}` : ""}`}>Create a work item <Icon name="arrow_forward" size={17} className="ml-1" /></Link>}</div>
        : <><div className="overflow-x-auto"><table className="w-full min-w-[1050px] border-collapse text-left"><thead className="bg-[#f3f2ff] text-[11px] font-semibold uppercase tracking-wider text-muted"><tr><th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all issues on this page" checked={pageRows.length > 0 && pageRows.every((issue) => selected.includes(issue.id))} onChange={(event) => setSelected((current) => event.target.checked ? [...new Set([...current, ...pageRows.map((issue) => issue.id)])] : current.filter((id) => !pageRows.some((issue) => issue.id === id)))} className="size-4 accent-violet-600" /></th>{["Key", "Summary & title", "Type", "Status", "Priority", "Assignee", "Reporter"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{pageRows.map((issue) => { const project = projects.find((item) => item.id === issue.project_id); const href = issue.is_draft ? `/work-items/new?draftId=${issue.id}&projectId=${issue.project_id}` : `/projects/${issue.project_id}/issues/${issue.id}`; return <tr key={issue.id} className="min-h-14 border-t border-border/40 transition hover:bg-[#f8f7ff]"><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${issue.key}`} checked={selected.includes(issue.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, issue.id] : current.filter((id) => id !== issue.id))} className="size-4 accent-violet-600" /></td><td className="px-4 py-3"><Link href={href} className="font-mono text-sm font-bold text-accent hover:underline">{issue.key}</Link></td><td className="max-w-[440px] px-4 py-3"><Link href={href} className="block truncate text-sm font-medium hover:text-accent">{issue.title || "Untitled work item"}</Link>{!scopedProjectId && <span className="mt-1 block truncate text-xs text-muted">{project?.name ?? "Project"}</span>}</td><td className="px-4 py-3 text-sm"><span className={`inline-flex items-center gap-1.5 type-${issue.issue_type}`}>{typeLabels[issue.issue_type]}</span></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium status-${issue.status}`}><i className="size-1.5 rounded-full bg-current" />{statusLabels[issue.status]}</span></td><td className={`px-4 py-3 text-sm priority-${issue.priority}`}>{priorityLabels[issue.priority]}</td><td className="px-4 py-3 text-sm text-muted">{issue.assignee_id ? `Member ${issue.assignee_id.slice(0, 8)}` : "Unassigned"}</td><td className="px-4 py-3 text-sm text-muted">Member {issue.reporter_id.slice(0, 8)}</td></tr>; })}</tbody></table></div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3 text-sm text-muted"><p>Showing {visible.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, visible.length)} of {visible.length} issues{selectedProject ? ` in ${selectedProject.name}` : ` across ${projects.length} projects`}</p><div className="flex items-center gap-1"><button type="button" disabled={currentPage <= 1} onClick={() => { setPage((value) => Math.max(1, Math.min(pageCount, value - 1))); setSelected([]); }} className="rounded-lg px-3 py-2 hover:bg-surface-low disabled:opacity-40">Previous</button><span className="rounded-lg bg-accent px-3 py-2 font-semibold text-white">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => { setPage((value) => Math.min(pageCount, value + 1)); setSelected([]); }} className="rounded-lg px-3 py-2 hover:bg-surface-low disabled:opacity-40">Next</button></div></footer></>}
    </section>
  </main>;
}
