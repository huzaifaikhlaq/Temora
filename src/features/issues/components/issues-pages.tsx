"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { issueApi, type Issue, type IssueInput, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { projectApi, type Project } from "@/features/projects/api/client";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";
import { TaskCreateForm } from "@/features/tasks/components/task-create-form";
import { WorkItemsDirectory } from "@/features/issues/components/work-items-directory";

const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const statusLabel: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To do", in_progress: "In progress", in_review: "In review", done: "Done" };
const priorityLabel: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const typeLabel: Record<IssueType, string> = { task: "Task", story: "Story", bug: "Bug", epic: "Epic" };
const inputClass = "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

function StatusBadge({ status }: { status: IssueStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium status-${status}`}><i className="size-1.5 rounded-full bg-current" />{statusLabel[status]}</span>;
}

export function IssuesDirectory() {
  return <WorkItemsDirectory />;
}

export function IssueCreateForm({ initialProjectId = "" }: { initialProjectId?: string }) {
  return <TaskCreateForm initialProjectId={initialProjectId} />;
}

export function IssueDetailPage({ projectId, issueId }: { projectId: string; issueId: string }) {
  const router = useRouter();
  const activeWorkspaceId = useWorkspaceScope()?.workspaceId;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const load = useCallback(async () => { if (!activeWorkspaceId) return; setLoading(true); setError(""); try { const [nextIssue, nextProject] = await Promise.all([issueApi.get(activeWorkspaceId, projectId, issueId), projectApi.get(activeWorkspaceId, projectId)]); setIssue(nextIssue); setDescription(nextIssue.description); setProject(nextProject); } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be loaded."); } finally { setLoading(false); } }, [activeWorkspaceId, projectId, issueId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function update(values: IssueInput) { if (!activeWorkspaceId) return; setBusy(true); setError(""); try { const changed = await issueApi.update(activeWorkspaceId, projectId, issueId, values); setIssue(changed); setDescription(changed.description); } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be updated."); } finally { setBusy(false); } }
  async function archive() { if (!activeWorkspaceId || !issue) return; setBusy(true); try { await issueApi.remove(activeWorkspaceId, projectId, issueId); router.push("/work-items"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue could not be archived."); setBusy(false); } }

  if (loading) return <div className="mx-auto max-w-5xl animate-pulse px-5 py-10"><div className="h-8 w-1/3 rounded bg-surface-high" /><div className="mt-7 h-80 rounded-xl bg-white" /></div>;
  return <div className="mx-auto max-w-[1120px] px-5 py-8 lg:px-8"><div className="mb-6 flex items-center gap-2 text-sm text-muted"><Link href="/work-items" className="hover:text-accent">Work Items</Link><Icon name="chevron_right" size={16} /><Link href={`/projects/${projectId}`} className="hover:text-accent">{project?.name ?? "Project"}</Link><Icon name="chevron_right" size={16} /><span className="font-mono text-xs">{issue?.key ?? "Issue"}</span></div>{error && <p role="alert" className="mb-5 rounded-lg border border-red/20 bg-red/5 p-3 text-sm text-red">{error}</p>}{!issue ? <section className="rounded-xl border border-border bg-white p-10 text-center"><Icon name="search_off" className="text-outline" size={30} /><h1 className="mt-3 text-lg font-semibold">Work Item unavailable</h1><p className="mt-1 text-sm text-muted">{error || "This issue may have been archived or removed."}</p><Link href="/work-items" className="mt-4 inline-flex text-sm font-semibold text-accent">Back to Work Items</Link></section> : <><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 font-mono text-xs text-outline">{issue.key} <span className="mx-1">Â·</span> {typeLabel[issue.issue_type]}</p><h1 className="max-w-3xl text-2xl font-semibold tracking-tight md:text-3xl">{issue.title || "Untitled work item"}</h1><p className="mt-2 text-sm text-muted">Created {new Date(issue.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })} Â· Updated {new Date(issue.updated_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p></div><button type="button" disabled={busy} onClick={() => void archive()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted hover:border-red/30 hover:text-red disabled:opacity-50"><Icon name="archive" size={17} />Archive</button></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><section className="space-y-5 rounded-xl border border-border/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-border/60 pb-3"><h2 className="font-semibold">Description</h2><button disabled={busy || description === issue.description} onClick={() => void update({ description })} className="text-xs font-semibold text-accent disabled:text-outline">Save changes</button></div><textarea rows={12} maxLength={50000} className="w-full resize-y rounded-lg border border-transparent bg-surface-low/70 p-3 text-sm leading-6 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15" aria-label="Issue description" placeholder="Add a descriptionâ€¦" value={description} onChange={(event) => setDescription(event.target.value)} /><div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2"><div className="rounded-lg bg-surface-low p-3"><p className="text-xs text-muted">Child issues</p><p className="mt-1 text-sm font-medium">{issue.subtasks_completed} of {issue.subtasks.length} completed</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-high"><div className="h-full rounded-full bg-accent" style={{ width: `${issue.subtasks.length ? (issue.subtasks_completed / issue.subtasks.length) * 100 : 0}%` }} /></div></div><div className="rounded-lg bg-surface-low p-3"><p className="text-xs text-muted">Attachments</p><p className="mt-1 text-sm font-medium">{issue.attachments.length} files</p></div></div>{issue.subtasks.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Child issues</h3><div className="divide-y divide-border/50 rounded-lg border border-border/60">{issue.subtasks.map((subtask) => <div key={subtask.id} className="flex items-center justify-between px-3 py-2.5"><span><span className="mr-2 font-mono text-[11px] text-outline">{subtask.key}</span><span className="text-sm">{subtask.title}</span></span><StatusBadge status={subtask.status} /></div>)}</div></div>}</section><aside className="h-fit space-y-4 rounded-xl border border-border/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Properties</h2>{busy && <Icon name="progress_activity" className="animate-spin text-accent" size={17} />}</div><label className="block text-xs font-semibold text-muted">STATUS<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={issue.status} disabled={busy} onChange={(event) => void update({ status: event.target.value as IssueStatus })}>{statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></label><label className="block text-xs font-semibold text-muted">PRIORITY<select className={`${inputClass} mt-1.5 text-sm font-normal text-foreground`} value={issue.priority} disabled={busy} onChange={(event) => void update({ priority: event.target.value as IssuePriority })}>{priorities.map((item) => <option key={item} value={item}>{priorityLabel[item]}</option>)}</select></label><div className="border-t border-border/60 pt-3"><p className="text-xs font-semibold text-muted">PROJECT</p><p className="mt-1.5 text-sm font-medium">{project?.name}</p><p className="font-mono text-[11px] text-outline">{project?.key}</p></div><div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3"><div><p className="text-xs text-muted">Story points</p><p className="mt-1 text-sm font-medium">{issue.story_points ?? "â€”"}</p></div><div><p className="text-xs text-muted">Due date</p><p className="mt-1 text-sm font-medium">{issue.due_date ? new Date(`${issue.due_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "â€”"}</p></div></div>{issue.tags.length > 0 && <div className="border-t border-border/60 pt-3"><p className="text-xs text-muted">Labels</p><div className="mt-2 flex flex-wrap gap-1.5">{issue.tags.map((tag) => <span key={tag} className="rounded-md bg-surface-low px-2 py-1 text-xs">{tag}</span>)}</div></div>}</aside></div></>}</div>;
}
