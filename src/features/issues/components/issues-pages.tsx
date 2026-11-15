"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/shared/icon";
import { issueApi, type Issue, type IssueInput, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { projectApi, type Project } from "@/features/projects/api/client";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const types: IssueType[] = ["task", "story", "bug", "epic"];
const statusLabel: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To do", in_progress: "In progress", in_review: "In review", done: "Done" };
const priorityLabel: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const typeLabel: Record<IssueType, string> = { task: "Task", story: "Story", bug: "Bug", epic: "Epic" };
const inputClass = "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

function StatusBadge({ status }: { status: IssueStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium status-${status}`}><i className="size-1.5 rounded-full bg-current" />{statusLabel[status]}</span>;
}

function PriorityMark({ priority }: { priority: IssuePriority }) {
  const bars = priority === "urgent" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  return <span className={`inline-flex h-4 items-end gap-0.5 priority-${priority}`} aria-label={`${priorityLabel[priority]} priority`}>{[1, 2, 3, 4].map((item) => <i key={item} className={`w-0.5 rounded-sm bg-current ${item <= bars ? "opacity-100" : "opacity-20"}`} style={{ height: `${4 + item * 2}px` }} />)}</span>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-accent">{eyebrow}</p>}<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{detail && <p className="mt-2 max-w-2xl text-sm text-muted">{detail}</p>}</div>{action}</div>;
}

export function IssuesDirectory() {
  const { activeWorkspaceId } = useDemoState();
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError("");
    try {
      const rows = (await projectApi.list(activeWorkspaceId)).filter((project) => !project.archived_at);
      setProjects(rows);
      const grouped = await Promise.all(rows.map(async (project) => (await issueApi.list(activeWorkspaceId, project.id)).map((issue) => ({ ...issue, project_id: project.id }))));
      setIssues(grouped.flat());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Issues could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => { void load(); }, [load]);

  const visibleIssues = useMemo(() => issues.filter((issue) => {
    const project = projects.find((item) => item.id === issue.project_id);
    const text = `${issue.key} ${issue.title} ${issue.description} ${project?.name ?? ""}`.toLowerCase();
    return (projectFilter === "all" || issue.project_id === projectFilter) && (statusFilter === "all" || issue.status === statusFilter) && text.includes(query.trim().toLowerCase());
  }), [issues, projects, projectFilter, statusFilter, query]);

  return <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8">
    <PageHeading eyebrow="Workspace / Work tracking" title="Issues" detail="Search, triage, and track every issue across your projects." action={<Link href="/issues/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong"><Icon name="add" size={18} />Create issue</Link>} />
    <div className="mb-5 grid gap-3 rounded-xl border border-border/70 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_190px_180px_auto]">
      <label className="relative"><Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" /><input className={`${inputClass} pl-10`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, key, or project" aria-label="Search issues" /></label>
      <select className={inputClass} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter by project"><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select>
      <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-low"><Icon name="refresh" size={17} />Refresh</button>
    </div>
    <section className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div><h2 className="font-semibold">Issue directory</h2><p className="mt-0.5 text-xs text-muted">{loading ? "Loading issues…" : `${visibleIssues.length} ${visibleIssues.length === 1 ? "issue" : "issues"}`}</p></div><span className="rounded-full bg-surface-low px-3 py-1 text-xs font-medium text-muted">{projects.length} projects</span></div>
      {error ? <div className="m-5 rounded-lg border border-red/20 bg-red/5 p-4 text-sm text-red" role="alert"><p className="font-medium">Couldn’t load issues</p><p className="mt-1">{error}</p><button onClick={() => void load()} className="mt-3 font-semibold underline">Try again</button></div> : loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-surface-low" />)}</div> : visibleIssues.length === 0 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="inbox" size={24} /></span><h3 className="mt-4 font-semibold">{issues.length ? "No issues match your filters" : "No issues yet"}</h3><p className="mt-1 text-sm text-muted">{issues.length ? "Try a different search or clear the filters." : "Create the first issue to start tracking work."}</p>{issues.length ? <button onClick={() => { setQuery(""); setStatusFilter("all"); setProjectFilter("all"); }} className="mt-3 text-sm font-semibold text-accent">Clear filters</button> : <Link className="mt-4 inline-flex font-semibold text-accent" href="/issues/new">Create an issue <Icon name="arrow_forward" size={17} className="ml-1" /></Link>}</div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-surface-low text-[11px] font-semibold uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Issue</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Type</th><th className="px-5 py-3">Updated</th></tr></thead><tbody>{visibleIssues.map((issue) => { const project = projects.find((item) => item.id === issue.project_id); return <tr key={issue.id} className="border-t border-border/50 transition hover:bg-surface-low/70"><td className="px-5 py-3"><Link href={`/projects/${issue.project_id}/issues/${issue.id}`} className="group flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/8 text-accent"><Icon name={issue.issue_type === "bug" ? "bug_report" : issue.issue_type === "epic" ? "flag" : "check_box"} size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-medium group-hover:text-accent">{issue.title || "Untitled issue"}</span><span className="mt-0.5 block font-mono text-[11px] text-outline">{issue.key}</span></span></Link></td><td className="px-4 py-3 text-sm text-muted">{project?.name ?? "Project"}</td><td className="px-4 py-3"><StatusBadge status={issue.status} /></td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-xs text-muted"><PriorityMark priority={issue.priority} />{priorityLabel[issue.priority]}</span></td><td className="px-4 py-3 text-sm text-muted">{typeLabel[issue.issue_type]}</td><td className="px-5 py-3 text-xs text-muted">{new Date(issue.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td></tr>; })}</tbody></table></div>}
    </section>
  </div>;
}

export function IssueCreateForm({ initialProjectId = "" }: { initialProjectId?: string }) {
  const router = useRouter();
  const { activeWorkspaceId } = useDemoState();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("task");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [status, setStatus] = useState<IssueStatus>("to_do");
  const [storyPoints, setStoryPoints] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (activeWorkspaceId) void projectApi.list(activeWorkspaceId).then((rows) => { const active = rows.filter((project) => !project.archived_at); setProjects(active); setProjectId((current) => current || active[0]?.id || ""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Projects could not be loaded.")); }, [activeWorkspaceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspaceId || !projectId || title.trim().length < 3) { setError("Choose a project and enter a title with at least 3 characters."); return; }
    if (storyPoints && ![1, 2, 3, 5, 8, 13].includes(Number(storyPoints))) { setError("Story points must be 1, 2, 3, 5, 8, or 13."); return; }
    setBusy(true); setError("");
    const input: IssueInput = { title: title.trim(), description: description.trim(), issue_type: issueType, priority, status, story_points: storyPoints ? Number(storyPoints) : null, due_date: dueDate || null };
    try { const issue = await issueApi.create(activeWorkspaceId, projectId, input); router.push(`/projects/${projectId}/issues/${issue.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be created."); setBusy(false); }
  }

  return <div className="mx-auto max-w-[960px] px-5 py-8 lg:px-8"><PageHeading eyebrow="Issues / New issue" title="Create an issue" detail="Capture the work, set its priority, and add it to the right project." /><form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-5 rounded-xl border border-border/70 bg-white p-6 shadow-sm"><label className="block text-sm font-medium">Issue title <span className="text-red">*</span><input autoFocus required minLength={3} maxLength={120} className={`${inputClass} mt-2`} placeholder="What needs to be done?" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block text-sm font-medium">Description<textarea maxLength={50000} rows={8} className="mt-2 w-full resize-y rounded-lg border border-border bg-white p-3 text-sm leading-6 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" placeholder="Add context, acceptance criteria, and any useful links…" value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="block text-sm font-medium">Due date <span className="font-normal text-muted">(optional)</span><input type="date" className={`${inputClass} mt-2 max-w-xs`} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>{error && <p role="alert" className="rounded-lg border border-red/20 bg-red/5 p-3 text-sm text-red">{error}</p>}<div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4"><Link href="/issues" className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-low">Cancel</Link><button disabled={busy || !projects.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60">{busy && <Icon name="progress_activity" className="animate-spin" size={17} />}Create issue</button></div></div><aside className="h-fit space-y-4 rounded-xl border border-border/70 bg-white p-5 shadow-sm"><h2 className="font-semibold">Details</h2><label className="block text-xs font-semibold text-muted">PROJECT<select required className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.key}</option>)}</select></label><label className="block text-xs font-semibold text-muted">ISSUE TYPE<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={issueType} onChange={(event) => setIssueType(event.target.value as IssueType)}>{types.map((type) => <option key={type} value={type}>{typeLabel[type]}</option>)}</select></label><label className="block text-xs font-semibold text-muted">STATUS<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>{statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></label><label className="block text-xs font-semibold text-muted">PRIORITY<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={priority} onChange={(event) => setPriority(event.target.value as IssuePriority)}>{priorities.map((item) => <option key={item} value={item}>{priorityLabel[item]}</option>)}</select></label><label className="block text-xs font-semibold text-muted">STORY POINTS<input type="number" min="1" max="13" step="1" className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} placeholder="1, 2, 3, 5, 8, 13" value={storyPoints} onChange={(event) => setStoryPoints(event.target.value)} /></label></aside></form></div>;
}

export function IssueDetailPage({ projectId, issueId }: { projectId: string; issueId: string }) {
  const router = useRouter();
  const { activeWorkspaceId } = useDemoState();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const load = useCallback(async () => { if (!activeWorkspaceId) return; setLoading(true); setError(""); try { const [nextIssue, nextProject] = await Promise.all([issueApi.get(activeWorkspaceId, projectId, issueId), projectApi.get(activeWorkspaceId, projectId)]); setIssue(nextIssue); setDescription(nextIssue.description); setProject(nextProject); } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be loaded."); } finally { setLoading(false); } }, [activeWorkspaceId, projectId, issueId]);
  useEffect(() => { void load(); }, [load]);

  async function update(values: IssueInput) { if (!activeWorkspaceId) return; setBusy(true); setError(""); try { const changed = await issueApi.update(activeWorkspaceId, projectId, issueId, values); setIssue(changed); setDescription(changed.description); } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be updated."); } finally { setBusy(false); } }
  async function archive() { if (!activeWorkspaceId || !issue) return; setBusy(true); try { await issueApi.remove(activeWorkspaceId, projectId, issueId); router.push("/issues"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be archived."); setBusy(false); } }

  if (loading) return <div className="mx-auto max-w-5xl animate-pulse px-5 py-10"><div className="h-8 w-1/3 rounded bg-surface-high" /><div className="mt-7 h-80 rounded-xl bg-white" /></div>;
  return <div className="mx-auto max-w-[1120px] px-5 py-8 lg:px-8"><div className="mb-6 flex items-center gap-2 text-sm text-muted"><Link href="/issues" className="hover:text-accent">Issues</Link><Icon name="chevron_right" size={16} /><Link href={`/projects/${projectId}`} className="hover:text-accent">{project?.name ?? "Project"}</Link><Icon name="chevron_right" size={16} /><span className="font-mono text-xs">{issue?.key ?? "Issue"}</span></div>{error && <p role="alert" className="mb-5 rounded-lg border border-red/20 bg-red/5 p-3 text-sm text-red">{error}</p>}{!issue ? <section className="rounded-xl border border-border bg-white p-10 text-center"><Icon name="search_off" className="text-outline" size={30} /><h1 className="mt-3 text-lg font-semibold">Issue unavailable</h1><p className="mt-1 text-sm text-muted">{error || "This issue may have been archived or removed."}</p><Link href="/issues" className="mt-4 inline-flex text-sm font-semibold text-accent">Back to issues</Link></section> : <><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 font-mono text-xs text-outline">{issue.key} <span className="mx-1">·</span> {typeLabel[issue.issue_type]}</p><h1 className="max-w-3xl text-2xl font-semibold tracking-tight md:text-3xl">{issue.title || "Untitled issue"}</h1><p className="mt-2 text-sm text-muted">Created {new Date(issue.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })} · Updated {new Date(issue.updated_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p></div><button type="button" disabled={busy} onClick={() => void archive()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted hover:border-red/30 hover:text-red disabled:opacity-50"><Icon name="archive" size={17} />Archive</button></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><section className="space-y-5 rounded-xl border border-border/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-border/60 pb-3"><h2 className="font-semibold">Description</h2><button disabled={busy || description === issue.description} onClick={() => void update({ description })} className="text-xs font-semibold text-accent disabled:text-outline">Save changes</button></div><textarea rows={12} maxLength={50000} className="w-full resize-y rounded-lg border border-transparent bg-surface-low/70 p-3 text-sm leading-6 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15" aria-label="Issue description" placeholder="Add a description…" value={description} onChange={(event) => setDescription(event.target.value)} /><div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2"><div className="rounded-lg bg-surface-low p-3"><p className="text-xs text-muted">Subtasks</p><p className="mt-1 text-sm font-medium">{issue.subtasks_completed} of {issue.subtasks.length} completed</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-high"><div className="h-full rounded-full bg-accent" style={{ width: `${issue.subtasks.length ? (issue.subtasks_completed / issue.subtasks.length) * 100 : 0}%` }} /></div></div><div className="rounded-lg bg-surface-low p-3"><p className="text-xs text-muted">Attachments</p><p className="mt-1 text-sm font-medium">{issue.attachments.length} files</p></div></div>{issue.subtasks.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Subtasks</h3><div className="divide-y divide-border/50 rounded-lg border border-border/60">{issue.subtasks.map((subtask) => <div key={subtask.id} className="flex items-center justify-between px-3 py-2.5"><span><span className="mr-2 font-mono text-[11px] text-outline">{subtask.key}</span><span className="text-sm">{subtask.title}</span></span><StatusBadge status={subtask.status} /></div>)}</div></div>}</section><aside className="h-fit space-y-4 rounded-xl border border-border/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Properties</h2>{busy && <Icon name="progress_activity" className="animate-spin text-accent" size={17} />}</div><label className="block text-xs font-semibold text-muted">STATUS<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={issue.status} disabled={busy} onChange={(event) => void update({ status: event.target.value as IssueStatus })}>{statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></label><label className="block text-xs font-semibold text-muted">PRIORITY<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={issue.priority} disabled={busy} onChange={(event) => void update({ priority: event.target.value as IssuePriority })}>{priorities.map((item) => <option key={item} value={item}>{priorityLabel[item]}</option>)}</select></label><div className="border-t border-border/60 pt-3"><p className="text-xs font-semibold text-muted">PROJECT</p><p className="mt-1.5 text-sm font-medium">{project?.name}</p><p className="font-mono text-[11px] text-outline">{project?.key}</p></div><div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3"><div><p className="text-xs text-muted">Story points</p><p className="mt-1 text-sm font-medium">{issue.story_points ?? "—"}</p></div><div><p className="text-xs text-muted">Due date</p><p className="mt-1 text-sm font-medium">{issue.due_date ? new Date(`${issue.due_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</p></div></div>{issue.tags.length > 0 && <div className="border-t border-border/60 pt-3"><p className="text-xs text-muted">Labels</p><div className="mt-2 flex flex-wrap gap-1.5">{issue.tags.map((tag) => <span key={tag} className="rounded-md bg-surface-low px-2 py-1 text-xs">{tag}</span>)}</div></div>}</aside></div></>}</div>;
}
