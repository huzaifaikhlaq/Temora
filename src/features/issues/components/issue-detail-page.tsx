"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const field = "rounded-lg border border-border bg-white px-3 py-2 text-sm";

export function IssueDetailPage({ issueId }: { issueId: string }) {
  const state = useDemoState();
  const issue = state.issues.find(item => (item.id === issueId || item.key === issueId) && item.workspaceId === state.activeWorkspaceId);
  const [title, setTitle] = useState(issue?.title ?? "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!issue) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-xl font-semibold">Issue not found</h1><p className="mt-2 text-sm text-muted">This issue is not available in the active workspace.</p><Link href="/issues" className="mt-4 inline-block text-accent">Back to all issues →</Link></main>;
  const activeIssue = issue;
  const project = state.projects.find(item => item.id === issue.projectId);
  const subtasks = state.subtasks.filter(item => item.issueId === issue.id);
  const comments = state.comments.filter(item => item.issueId === issue.id);

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { demoRepository.addComment(activeIssue.id, comment); setComment(""); setError(""); setNotice("Comment added to this browser's demo workspace."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add comment."); }
  }

  return <main className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center gap-2 text-sm text-muted"><Link href={`/projects/${issue.projectId}`} className="hover:text-accent">{project?.name ?? "Project"}</Link><span>/</span><span>{issue.key}</span></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5"><section className="rounded-xl border border-border bg-white p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-accent/10 px-2 py-1 font-mono text-xs font-semibold text-accent">{issue.key}</span><span className="text-xs text-muted">{project?.name}</span><Link className="ml-auto text-sm text-accent" href={`/issues/${issue.id}/dependencies`}>Dependencies &amp; activity →</Link></div><input aria-label="Issue title" className="mt-4 w-full border-0 bg-transparent p-0 text-2xl font-bold outline-none" value={title} onChange={event => setTitle(event.target.value)} onBlur={() => { try { demoRepository.updateIssue(issue.id, { title }); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid title."); } }} /><textarea aria-label="Description" className="mt-4 min-h-40 w-full rounded-lg border border-border p-3 text-sm leading-6 outline-none focus:border-accent" value={issue.description} onChange={event => demoRepository.updateIssue(issue.id, { description: event.target.value })} /><div className="mt-5"><h2 className="font-semibold">Subtasks</h2><div className="mt-2 space-y-2">{subtasks.map(item => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.completed} onChange={event => demoRepository.updateSubtask(item.id, { completed: event.target.checked })} />{item.title}</label>)}</div><AddSubtask issueId={issue.id} /></div></section>
        <section className="rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Activity &amp; comments</h2><form onSubmit={addComment} className="mt-3 flex gap-2"><input className={`${field} min-w-0 flex-1`} value={comment} onChange={event => setComment(event.target.value)} placeholder="Write a comment…"/><button className="rounded-lg bg-accent px-3 text-sm font-semibold text-white">Comment</button></form>{comments.map(item => <article key={item.id} className="mt-4 rounded-lg bg-surface-low p-3 text-sm"><p>{item.body}</p><p className="mt-1 text-xs text-muted">{state.members.find(person => person.id === item.authorId)?.name ?? "Workspace member"} · {item.createdAt}</p></article>)}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}</section></div>
      <aside className="h-fit space-y-3 rounded-xl border border-border bg-white p-4"><label className="block text-xs font-medium text-muted">Status<select className={`${field} mt-1 w-full`} value={issue.status} onChange={event => demoRepository.updateIssue(issue.id, { status: event.target.value as typeof issue.status })}>{["Backlog","To Do","In Progress","In Review","Done"].map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-medium text-muted">Priority<select className={`${field} mt-1 w-full`} value={issue.priority} onChange={event => demoRepository.updateIssue(issue.id, { priority: event.target.value as typeof issue.priority })}>{["Urgent","High","Medium","Low"].map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-medium text-muted">Assignee<select className={`${field} mt-1 w-full`} value={issue.assigneeId ?? ""} onChange={event => demoRepository.updateIssue(issue.id, { assigneeId: event.target.value || null })}><option value="">Unassigned</option>{state.members.filter(person => person.workspaceId === issue.workspaceId).map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><p className="text-xs text-muted">Changes are stored in this browser’s local demo workspace.</p></aside>
    </div>
  </main>;
}

function AddSubtask({ issueId }: { issueId: string }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  return <form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); try { demoRepository.addSubtask(issueId, title); setTitle(""); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add subtask."); } }}><input className={`${field} min-w-0 flex-1`} value={title} onChange={event => setTitle(event.target.value)} placeholder="Add a subtask"/><button className="rounded-lg border border-border px-3 text-sm">Add</button>{error && <span role="alert" className="text-xs text-red-700">{error}</span>}</form>;
}
