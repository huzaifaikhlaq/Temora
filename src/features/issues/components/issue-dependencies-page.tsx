"use client";

import Link from "next/link";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

export function IssueDependenciesPage({ issueId }: { issueId: string }) {
  const state = useDemoState();
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
  const blockedBy = state.issues.filter((item) => issue.blockedByIds.includes(item.id));
  const blocks = state.issues.filter((item) => issue.blocksIds.includes(item.id));
  const activity = state.comments.filter((item) => item.issueId === issue.id);
  const row = (related: typeof state.issues) =>
    related.length ? (
      related.map((item) => (
        <Link
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-accent"
          href={`/issues/${item.id}`}
        >
          <span>
            <strong className="font-mono text-xs text-accent">{item.key}</strong>
            <span className="ml-3 text-sm">{item.title}</span>
          </span>
          <span className="text-xs text-muted">{item.status}</span>
        </Link>
      ))
    ) : (
      <p className="rounded-lg bg-surface-low p-4 text-sm text-muted">No linked issues</p>
    );
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href={`/issues/${issue.id}`} className="text-sm text-accent">
          ← {issue.key}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Issue dependencies &amp; activity</h1>
        <p className="mt-1 text-sm text-muted">
          Review the work blocking this issue and the work it unblocks.
        </p>
      </div>
      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold">
          {issue.key} · {issue.title}
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Blocked by</h3>
            <div className="space-y-2">{row(blockedBy)}</div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Blocks downstream</h3>
            <div className="space-y-2">{row(blocks)}</div>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold">Activity history</h2>
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
          <p className="mt-3 text-sm text-muted">
            Activity appears here as this issue changes in the local demo.
          </p>
        )}
      </section>
    </main>
  );
}
