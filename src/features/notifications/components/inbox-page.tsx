"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const categories = [
  "All activity",
  "Assigned to Me",
  "Mentions",
  "Comments",
  "System & Sprints",
] as const;

export function InboxPage() {
  const state = useDemoState();
  const [category, setCategory] = useState<(typeof categories)[number]>("All activity");
  const [showUnread, setShowUnread] = useState(false);
  const notifications = useMemo(
    () =>
      state.notifications
        .filter(
          (item) =>
            item.workspaceId === state.activeWorkspaceId &&
            item.recipientId === state.activeMemberId,
        )
        .filter((item) => category === "All activity" || item.category === category)
        .filter((item) => !showUnread || !item.readAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.notifications, state.activeWorkspaceId, state.activeMemberId, category, showUnread],
  );
  const unread = state.notifications.filter(
    (item) =>
      item.workspaceId === state.activeWorkspaceId &&
      item.recipientId === state.activeMemberId &&
      !item.readAt,
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">
            Workspace / Notifications
          </p>
          <h1 className="mt-1 text-2xl font-bold">Inbox</h1>
          <p className="mt-1 text-sm text-muted">Updates for your active workspace and account.</p>
        </div>
        <button
          disabled={!unread}
          onClick={() => demoRepository.markAllNotificationsRead()}
          className="h-9 rounded-lg border border-border bg-white px-3 text-sm disabled:opacity-50"
        >
          Mark all as read
        </button>
      </header>
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`rounded-full px-3 py-1.5 text-sm ${category === item ? "bg-accent text-white" : "bg-white text-muted ring-1 ring-border"}`}
          >
            {item}
            {item === "All activity" && <span className="ml-2 font-mono text-xs">{unread}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowUnread((value) => !value)}
          aria-pressed={showUnread}
          className={`rounded-full px-3 py-1.5 text-sm ${showUnread ? "bg-accent/10 text-accent" : "bg-white text-muted ring-1 ring-border"}`}
        >
          Unread only
        </button>
      </div>
      <Panel>
        {notifications.length > 0 ? (
          notifications.map((item) => {
            const actor = state.members.find((person) => person.id === item.actorId);
            const task = state.tasks.find(
              (record) => record.id === item.taskId || record.key === item.taskId,
            );
            return (
              <article
                key={item.id}
                className={`flex gap-3 border-b border-border/70 p-4 last:border-0 ${item.readAt ? "" : "bg-accent/[.035]"}`}
              >
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${item.readAt ? "bg-surface-high" : "bg-accent"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <strong>{actor?.name ?? "Temora"}</strong> {item.message}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{item.category}</span>
                    <span>{item.createdAt}</span>
                    {task && (
                      <Link href={`/tasks/${task.key}`} className="font-mono text-accent">
                        {task.key}
                      </Link>
                    )}
                  </div>
                </div>
                <button
                  className="shrink-0 text-xs font-medium text-accent"
                  onClick={() => demoRepository.setNotificationRead(item.id, !item.readAt)}
                >
                  {item.readAt ? "Mark unread" : "Mark read"}
                </button>
              </article>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <h2 className="font-semibold">You’re all caught up</h2>
            <p className="mt-1 text-sm text-muted">
              New assignments, comments, and sprint activity will show here.
            </p>
          </div>
        )}
      </Panel>
      <p className="text-xs text-muted">Inbox state is saved in this browser’s demo workspace.</p>
    </main>
  );
}
