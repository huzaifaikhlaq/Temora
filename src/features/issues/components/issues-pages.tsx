"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Icon } from "@/components/shared/icon";
import { issueApi, type Issue, type IssueInput, type IssuePriority, type IssueStatus, type IssueType } from "@/features/issues/api/client";
import { projectApi, type Project } from "@/features/projects/api/client";
import { TaskCreateForm } from "@/features/tasks/components/task-create-form";
import { WorkItemsDirectory } from "@/features/issues/components/work-items-directory";
import { useWorkspaceScope } from "@/features/workspace/hooks/workspace-scope";
import { workspaceApi } from "@/features/workspace/api/client";
import type { WorkspaceMember } from "@/features/workspace/types";

const statuses: IssueStatus[] = ["backlog", "to_do", "in_progress", "in_review", "done"];
const priorities: IssuePriority[] = ["urgent", "high", "medium", "low"];
const statusLabel: Record<IssueStatus, string> = { backlog: "Backlog", to_do: "To Do", in_progress: "In Progress", in_review: "In Review", done: "Done" };
const priorityLabel: Record<IssuePriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const typeLabel: Record<IssueType, string> = { task: "Task", story: "Story", bug: "Bug", epic: "Epic" };

function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Not set";
}

function initials(userId: string) {
  return userId.slice(0, 2).toUpperCase();
}

export function IssuesDirectory() {
  return <WorkItemsDirectory />;
}

export function IssueCreateForm({ initialProjectId = "" }: { initialProjectId?: string }) {
  return <TaskCreateForm initialProjectId={initialProjectId} />;
}

export function IssueDetailPage({ projectId, issueId }: { projectId: string; issueId: string }) {
  const router = useRouter();
  const scope = useWorkspaceScope();
  const workspaceId = scope?.workspaceId;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [relatedIssues, setRelatedIssues] = useState<Issue[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [labelsValue, setLabelsValue] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [nextIssue, nextProject, nextRelated, nextMembers] = await Promise.all([
        issueApi.get(workspaceId, projectId, issueId),
        projectApi.get(workspaceId, projectId),
        issueApi.list(workspaceId, projectId).catch(() => [] as Issue[]),
        workspaceApi.members(workspaceId).catch(() => [] as WorkspaceMember[]),
      ]);
      setIssue(nextIssue);
      setProject(nextProject);
      setRelatedIssues(nextRelated);
      setMembers(nextMembers);
      setDescription(nextIssue.description ?? "");
      setLabelsValue((nextIssue.tags ?? []).join(", "));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Work item could not be loaded.");
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, issueId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const memberNames = useMemo(() => new Map(members.map((member) => [member.user_id, `Member ${member.user_id.slice(0, 8)}`])), [members]);
  const getMemberName = (id: string | null) => id ? id === scope?.userId ? "You" : memberNames.get(id) ?? `Member ${id.slice(0, 8)}` : "Unassigned";
  const relatedById = useMemo(() => new Map(relatedIssues.map((item) => [item.id, item])), [relatedIssues]);
  const linkedItems = [issue?.parent_id ? relatedById.get(issue.parent_id) : undefined, issue?.epic_id ? relatedById.get(issue.epic_id) : undefined].filter((item): item is Issue => Boolean(item));
  const childItems = issue?.subtasks ?? [];
  const subtaskProgress = childItems.length ? Math.round((issue!.subtasks_completed / childItems.length) * 100) : 0;

  async function update(values: IssueInput) {
    if (!workspaceId || !issue || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const changed = await issueApi.update(workspaceId, projectId, issue.id, values);
      setIssue(changed);
      setDescription(changed.description ?? "");
      setLabelsValue((changed.tags ?? []).join(", "));
      setNotice("Issue changes saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Issue could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSubtask(subtask: Issue["subtasks"][number]) {
    if (!workspaceId || !issue || busy) return;
    setBusy(true);
    setError("");
    try {
      const changed = await issueApi.update(workspaceId, projectId, subtask.id, { status: subtask.status === "done" ? "to_do" : "done" });
      setIssue((current) => current ? { ...current, subtasks: current.subtasks.map((item) => item.id === changed.id ? { ...item, status: changed.status } : item), subtasks_completed: current.subtasks.filter((item) => item.id === changed.id ? changed.status === "done" : item.status === "done").length } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not update ${subtask.key}.`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!workspaceId || !issue || files.length === 0) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      for (const file of files) await issueApi.upload(workspaceId, projectId, issue.id, file);
      await load();
      setNotice(`${files.length} attachment${files.length === 1 ? "" : "s"} uploaded.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attachment could not be uploaded.");
    } finally {
      setUploading(false);
      setFileInputKey((value) => value + 1);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Issue link copied.");
    } catch {
      setError("This browser could not copy the issue link.");
    }
  }

  async function archive() {
    if (!workspaceId || !issue || busy) return;
    setBusy(true);
    setError("");
    try {
      await issueApi.remove(workspaceId, projectId, issue.id);
      router.push(`/projects/${projectId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Issue could not be archived.");
      setBusy(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-[1500px] animate-pulse space-y-5 p-6"><div className="h-8 w-1/3 rounded bg-surface-high" /><div className="h-16 rounded-xl bg-white" /><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="h-[560px] rounded-2xl bg-white" /><div className="h-[560px] rounded-2xl bg-white" /></div></main>;

  if (!issue) return <main className="mx-auto max-w-3xl p-8"><section className="rounded-2xl border border-border bg-white p-10 text-center"><Icon name="search_off" className="text-outline" size={30} /><h1 className="mt-3 text-xl font-semibold">Issue unavailable</h1><p className="mt-2 text-sm text-muted">{error || "This issue may have been archived or removed."}</p><Link href="/work-items" className="mt-5 inline-flex text-sm font-semibold text-accent">Back to Work Items</Link></section></main>;

  const attachmentSize = (bytes: number) => bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;

  return <main className="mx-auto max-w-[1700px] space-y-5 bg-[#f7f6ff]/70 px-4 py-5 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted"><Link href={`/projects/${projectId}`} aria-label="Back to project issues" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-white hover:text-accent"><Icon name="arrow_back" size={20} /></Link><Link href="/projects" className="hidden hover:text-accent sm:block">Projects</Link><span className="hidden sm:block">/</span><Link href={`/projects/${projectId}`} className="max-w-40 truncate hover:text-accent">{project?.name ?? "Project"}</Link><span>/</span><span className="font-mono font-semibold text-accent">{issue.key}</span></div>
      <div className="flex items-center gap-1"><button type="button" onClick={() => void copyLink()} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted hover:bg-white hover:text-accent"><Icon name="link" size={17} />Copy link</button><button type="button" onClick={() => void archive()} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted hover:bg-red/5 hover:text-red disabled:opacity-50"><Icon name="archive" size={17} />Archive</button></div>
    </div>

    {error && <p role="alert" className="rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green/20 bg-green/5 px-4 py-3 text-sm text-green">{notice}</p>}

    <header className="flex flex-wrap items-center gap-2 pb-1">
      <span className={`inline-flex items-center gap-2 rounded-md bg-accent/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-accent`}><Icon name={issue.issue_type === "bug" ? "bug_report" : issue.issue_type === "story" ? "bookmark" : issue.issue_type === "epic" ? "bolt" : "task_alt"} size={16} />{typeLabel[issue.issue_type]} · {issue.key}</span>
      <label className="sr-only" htmlFor="issue-status">Issue status</label><select id="issue-status" className="h-10 rounded-lg border border-accent/10 bg-accent/10 px-3 text-sm font-semibold text-accent outline-none" value={issue.status} disabled={busy} onChange={(event) => void update({ status: event.target.value as IssueStatus })}>{statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}</select>
      <label className="sr-only" htmlFor="issue-priority">Issue priority</label><select id="issue-priority" className={`h-10 rounded-lg border border-red/10 bg-red/5 px-3 text-sm font-semibold priority-${issue.priority} outline-none`} value={issue.priority} disabled={busy} onChange={(event) => void update({ priority: event.target.value as IssuePriority })}>{priorities.map((item) => <option key={item} value={item}>{priorityLabel[item]}</option>)}</select>
      <span className="ml-auto hidden text-xs font-mono text-muted sm:block">Updated {dateLabel(issue.updated_at)}</span>
      <button type="button" onClick={() => void update({ status: issue.status === "done" ? "in_progress" : "done" })} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong disabled:opacity-50"><Icon name={issue.status === "done" ? "undo" : "check"} size={17} />{issue.status === "done" ? "Reopen Issue" : "Complete Issue"}</button>
    </header>
    <h1 className="max-w-5xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{issue.title || "Untitled work item"}</h1>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-mono text-xs font-bold uppercase tracking-[.16em] text-muted">Description</h2><button type="button" onClick={() => { if (editingDescription) { setDescription(issue.description); setEditingDescription(false); } else { setEditingDescription(true); } }} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent disabled:opacity-50"><Icon name={editingDescription ? "close" : "edit"} size={16} />{editingDescription ? "Cancel" : "Edit"}</button></div>
          {editingDescription ? <><textarea rows={7} maxLength={50000} aria-label="Issue description" className="min-h-40 w-full resize-y rounded-xl border border-border bg-[#f7f6ff] p-4 text-sm leading-6 outline-none focus:border-accent" placeholder="Add a description..." value={description} onChange={(event) => setDescription(event.target.value)} /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => { setDescription(issue.description); setEditingDescription(false); }} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-low">Cancel</button><button type="button" onClick={async () => { await update({ description }); setEditingDescription(false); }} disabled={busy || description === issue.description} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save description</button></div></> : <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{issue.description || <span className="text-muted">No description has been added.</span>}</p>}
        </section>

        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between"><h2 className="font-mono text-xs font-bold uppercase tracking-[.16em] text-muted">Checklist</h2><span className="font-mono text-xs font-semibold text-green">{issue.subtasks_completed} of {childItems.length} done</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eeedf7]"><div className="h-full rounded-full bg-green transition-all" style={{ width: `${subtaskProgress}%` }} /></div>
          {childItems.length ? <ul className="mt-4 space-y-2">{childItems.map((subtask) => <li key={subtask.id} className="flex items-center gap-3 rounded-lg bg-[#f7f6ff] px-3 py-3"><button type="button" onClick={() => void toggleSubtask(subtask)} disabled={busy} aria-label={`${subtask.status === "done" ? "Reopen" : "Complete"} ${subtask.key}`} className={`grid size-5 shrink-0 place-items-center rounded border ${subtask.status === "done" ? "border-accent bg-accent text-white" : "border-border bg-white text-transparent"}`}><Icon name="check" size={14} /></button><Link href={`/projects/${projectId}/issues/${subtask.id}`} className={`min-w-0 flex-1 text-sm hover:text-accent ${subtask.status === "done" ? "text-muted line-through" : ""}`}><span className="mr-2 font-mono text-xs text-accent">{subtask.key}</span>{subtask.title}</Link><span className="hidden text-xs text-muted sm:block">{statusLabel[subtask.status]}</span></li>)}</ul> : <p className="mt-4 rounded-lg bg-[#f7f6ff] p-4 text-sm text-muted">No checklist items are linked to this issue.</p>}
        </section>

        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between"><h2 className="font-mono text-xs font-bold uppercase tracking-[.16em] text-muted">Linked issues</h2>{linkedItems.length + childItems.length === 0 && <span className="text-xs text-muted">No relationships</span>}</div>
          <div className="mt-3 space-y-2">{linkedItems.map((item) => <Link key={item.id} href={`/projects/${projectId}/issues/${item.id}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f3f2ff] px-3 py-3 text-sm hover:bg-accent/10"><span className="rounded bg-white px-2 py-1 font-mono text-xs font-bold text-accent">{item.key}</span><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-xs text-muted">{item.id === issue.parent_id ? "Parent" : "Epic"}</span><span className={`rounded-md px-2 py-1 text-xs status-${item.status}`}>{statusLabel[item.status]}</span></Link>)}{childItems.map((item) => <Link key={item.id} href={`/projects/${projectId}/issues/${item.id}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f3f2ff] px-3 py-3 text-sm hover:bg-accent/10"><span className="rounded bg-white px-2 py-1 font-mono text-xs font-bold text-accent">{item.key}</span><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-xs text-muted">Child</span><span className={`rounded-md px-2 py-1 text-xs status-${item.status}`}>{statusLabel[item.status]}</span></Link>)}</div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-mono text-xs font-bold uppercase tracking-[.16em] text-muted">Attachments</h2><p className="mt-1 text-xs text-muted">{issue.attachments.length} file{issue.attachments.length === 1 ? "" : "s"}</p></div><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-accent hover:bg-accent/5"><Icon name={uploading ? "progress_activity" : "upload_file"} size={17} className={uploading ? "animate-spin" : ""} />{uploading ? "Uploading..." : "Upload"}<input key={fileInputKey} type="file" multiple className="sr-only" disabled={uploading} onChange={(event) => void uploadFiles(event)} /></label></div>
          {issue.attachments.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{issue.attachments.map((attachment) => <a key={attachment.id} href={issueApi.attachmentUrl(workspaceId!, projectId, issue.id, attachment.id)} download={attachment.original_name} className="flex min-w-0 items-center gap-3 rounded-xl bg-[#f3f2ff] p-3 hover:bg-accent/10"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-accent"><Icon name="description" size={20} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{attachment.original_name}</span><span className="mt-1 block text-xs text-muted">{attachmentSize(attachment.size)} · {dateLabel(attachment.created_at)}</span></span><Icon name="download" size={17} className="text-muted" /></a>)}</div> : <p className="mt-4 rounded-lg bg-[#f7f6ff] p-4 text-sm text-muted">No attachments have been added.</p>}
        </section>

        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-5 border-b border-border/50 pb-3"><h2 className="font-semibold text-accent">Comments</h2><span className="text-sm text-muted">Activity history</span></div><div className="mt-5 rounded-xl bg-[#f7f6ff] p-5 text-sm text-muted"><Icon name="history" size={18} className="mr-2 inline-block" />Comments and issue history are not available from the current issue service.</div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-5">
        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-mono text-xs font-bold uppercase tracking-[.16em] text-muted">Properties &amp; meta</h2>{busy && <Icon name="progress_activity" className="animate-spin text-accent" size={17} />}</div>
          <div className="space-y-1"><Property label="Assignee" icon="person"><label className="sr-only" htmlFor="issue-assignee">Assignee</label><select id="issue-assignee" className="max-w-[190px] truncate border-0 bg-transparent text-right text-sm font-semibold outline-none" value={issue.assignee_id ?? ""} disabled={busy} onChange={(event) => void update({ assignee_id: event.target.value || null })}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.user_id}>{getMemberName(member.user_id)}</option>)}</select></Property>
          <Property label="Priority" icon="flag"><span className={`rounded-full px-2.5 py-1 text-xs font-bold priority-${issue.priority}`}>{priorityLabel[issue.priority]}</span></Property>
          <Property label="Reporter" icon="person_add"><span className="inline-flex items-center gap-2 text-sm font-medium"><span className="grid size-7 place-items-center rounded-full bg-accent/10 font-mono text-[10px] text-accent">{initials(issue.reporter_id)}</span>{getMemberName(issue.reporter_id)}</span></Property>
          <Property label="Sprint" icon="cycle"><span className="max-w-[190px] truncate rounded-md bg-[#f0effa] px-2 py-1 font-mono text-xs">{issue.sprint_id ?? "Not assigned"}</span></Property>
          <Property label="Story points" icon="flag"><span className="rounded-md bg-[#f0effa] px-2 py-1 font-mono text-sm font-semibold">{issue.story_points ?? "Not set"}</span></Property>
          <Property label="Due date" icon="calendar_today"><label className="sr-only" htmlFor="issue-due-date">Due date</label><input id="issue-due-date" type="date" className="max-w-[170px] rounded-md border border-transparent bg-[#f7f6ff] px-2 py-1 text-xs font-semibold outline-none focus:border-accent" value={issue.due_date ?? ""} disabled={busy} onChange={(event) => void update({ due_date: event.target.value || null })} /></Property>
          <Property label="Project" icon="folder_open"><Link href={`/projects/${projectId}`} className="text-sm font-semibold hover:text-accent">{project?.name ?? "Project"}</Link></Property>
          <div className="border-t border-border/50 py-3"><label className="mb-2 block text-xs font-medium text-muted">Tags &amp; labels</label><input className="w-full rounded-lg border border-transparent bg-[#f7f6ff] px-3 py-2 text-sm outline-none focus:border-accent" aria-label="Tags and labels" value={labelsValue} disabled={busy} onChange={(event) => setLabelsValue(event.target.value)} onBlur={() => { const nextTags = labelsValue.split(",").map((item) => item.trim()).filter(Boolean); if (JSON.stringify(nextTags) !== JSON.stringify(issue.tags)) void update({ tags: nextTags }); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder="Design, UI, release..." /><div className="mt-2 flex flex-wrap gap-1.5">{issue.tags.map((tag) => <span key={tag} className="rounded-md bg-[#f0effa] px-2 py-1 font-mono text-[11px] text-muted">{tag}</span>)}</div></div>
          <div className="border-t border-border/50 pt-3 font-mono text-[11px] text-muted"><p>Created {dateLabel(issue.created_at)}</p><p className="mt-1">Updated {dateLabel(issue.updated_at)}</p></div>
          </div>
        </section>
        <section className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm"><h2 className="font-mono text-xs font-bold uppercase tracking-[.16em] text-muted">Issue activity</h2><p className="mt-3 text-sm text-muted">This view shows live issue fields and linked work. Activity events are not exposed by the current service.</p></section>
      </aside>
    </div>
  </main>;
}

function Property({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/40 py-2.5 last:border-0"><span className="flex shrink-0 items-center gap-2 text-sm text-muted"><Icon name={icon} size={17} />{label}</span><span className="min-w-0 text-right">{children}</span></div>;
}
