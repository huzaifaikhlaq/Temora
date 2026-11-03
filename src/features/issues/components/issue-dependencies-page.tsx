"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type Relation = "blocks" | "blocked-by" | "relates-to";

export function IssueDependenciesPage({ issueId }: { issueId: string }) {
  const state = useDemoState();
  const [adding, setAdding] = useState(false);
  const [relation, setRelation] = useState<Relation>("blocked-by");
  const [relatedIssueId, setRelatedIssueId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const issue = state.issues.find(
    (item) =>
      (item.id === issueId || item.key === issueId) && item.workspaceId === state.activeWorkspaceId,
  );

  if (!issue)
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Issue not found</h1>
        <Link className="mt-3 inline-block text-accent" href="/issues">
          Back to issues →
        </Link>
      </main>
    );

  const currentIssue = issue!;
  const workspaceIssues = state.issues.filter(
    (item) => item.workspaceId === state.activeWorkspaceId,
  );
  const blockedBy = workspaceIssues.filter((item) => currentIssue.blockedByIds.includes(item.id));
  const blocks = workspaceIssues.filter((item) => currentIssue.blocksIds.includes(item.id));
  const related = workspaceIssues.filter((item) => currentIssue.relatedIds?.includes(item.id));
  const linkedIds = new Set([
    ...currentIssue.blockedByIds,
    ...currentIssue.blocksIds,
    ...(currentIssue.relatedIds ?? []),
  ]);
  const candidates = workspaceIssues.filter(
    (item) => item.id !== currentIssue.id && !linkedIds.has(item.id),
  );
  const activity = state.comments.filter((item) => item.issueId === currentIssue.id);
  const project = state.projects.find((item) => item.id === currentIssue.projectId);

  function addDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!relatedIssueId) return;
    try {
      demoRepository.addIssueDependency(currentIssue.id, relatedIssueId, relation);
      setAdding(false);
      setRelatedIssueId("");
      setError("");
      setNotice("Dependency saved in this browser’s demo workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add dependency.");
    }
  }

  function removeDependency(relatedId: string, linkType: Relation) {
    try {
      demoRepository.removeIssueDependency(currentIssue.id, relatedId, linkType);
      setError("");
      setNotice("Dependency removed from this browser’s demo workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove dependency.");
    }
  }

  const relationSection = (title: string, items: typeof workspaceIssues, linkType: Relation) => (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <Link className="min-w-0 flex-1" href={`/issues/${item.key}`}>
                <strong className="font-mono text-xs text-accent">{item.key}</strong>
                <span className="ml-3 text-sm">{item.title}</span>
                <span className="ml-3 text-xs text-muted">{item.status}</span>
              </Link>
              <button
                type="button"
                onClick={() => removeDependency(item.id, linkType)}
                className="shrink-0 text-xs font-medium text-red-700"
              >
                Remove
              </button>
            </article>
          ))
        ) : (
          <p className="rounded-lg bg-surface-low p-4 text-sm text-muted">No linked issues</p>
        )}
      </div>
    </section>
  );

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href={`/issues/${currentIssue.key}`} className="text-sm text-accent">
          ← {currentIssue.key}
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[.16em] text-outline">
          {project?.name ?? "Project"} / Issue
        </p>
        <h1 className="mt-1 text-2xl font-bold">Issue dependencies &amp; activity</h1>
        <p className="mt-1 text-sm text-muted">
          Review and update the work blocking this issue and the work it unblocks.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs font-semibold text-accent">{currentIssue.key}</span>
            <h2 className="mt-1 text-lg font-semibold">{currentIssue.title}</h2>
            <p className="mt-1 text-sm text-muted">
              {currentIssue.status} · {currentIssue.priority} priority · {currentIssue.storyPoints} story points
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAdding((open) => !open);
              setError("");
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
          >
            <Icon name="account_tree" /> Add Dependency
          </button>
        </div>
        {adding && (
          <form
            onSubmit={addDependency}
            className="mt-4 grid gap-3 rounded-lg bg-surface-low p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto_auto]"
          >
            <label className="text-xs font-semibold">
              Relationship
              <select
                value={relation}
                onChange={(event) => setRelation(event.target.value as Relation)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-white px-2 text-sm font-normal"
              >
                <option value="blocked-by">Blocked by</option>
                <option value="blocks">Blocks</option>
                <option value="relates-to">Relates to</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Issue
              <select
                required
                value={relatedIssueId}
                onChange={(event) => setRelatedIssueId(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-white px-2 text-sm font-normal"
              >
                <option value="">Select an issue</option>
                {candidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.key} · {item.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!relatedIssueId}
              className="mt-5 h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setRelatedIssueId("");
              }}
              className="mt-5 h-9 rounded-lg border border-border bg-white px-3 text-sm"
            >
              Cancel
            </button>
            {candidates.length === 0 && (
              <p className="text-xs text-muted sm:col-span-4">
                All issues in this workspace are already linked.
              </p>
            )}
          </form>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold">Issue dependency graph</h2>
        <p className="mt-1 text-xs text-muted">
          Links are stored in the shared browser demo state. Cyclic blocking relationships are
          prevented.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {relationSection("Blocked by", blockedBy, "blocked-by")}
          {relationSection("Blocks downstream", blocks, "blocks")}
          {relationSection("Related issues", related, "relates-to")}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold">Activity history</h2>
        <p className="mt-1 text-xs text-muted">
          Comments are shown from the shared workspace mock data. Full change audit history is not
          recorded.
        </p>
        {activity.length ? (
          activity.map((item) => (
            <article key={item.id} className="mt-3 rounded-lg bg-surface-low p-3 text-sm">
              <p>{item.body}</p>
              <p className="mt-1 text-xs text-muted">
                {state.members.find((member) => member.id === item.authorId)?.name ??
                  "Workspace member"}{" "}
                · {item.createdAt}
              </p>
            </article>
          ))
        ) : (
          <p className="mt-3 text-sm text-muted">No comments have been recorded for this issue.</p>
        )}
      </section>
    </main>
  );
}
