"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type AuditEvent = {
  id: string;
  date: string;
  actor: string;
  event: string;
  resource: string;
  category: "Task snapshot" | "Comment";
};

function downloadCsv(events: AuditEvent[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csv = [
    ["Date", "Category", "Actor", "Event", "Resource"].map(quote).join(","),
    ...events.map((event) =>
      [event.date, event.category, event.actor, event.event, event.resource].map(quote).join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "temora-demo-activity.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AuditPreview() {
  const state = useDemoState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All activity");
  const [rangeDays, setRangeDays] = useState("30");
  const members = state.members.filter((member) => member.workspaceId === state.activeWorkspaceId);
  const events = useMemo(() => {
    const taskEvents: AuditEvent[] = state.tasks
      .filter((task) => task.workspaceId === state.activeWorkspaceId)
      .map((task) => ({
        id: `task-${task.id}`,
        date: task.updatedAt,
        actor: "Actor not recorded",
        event: `Latest task snapshot · ${task.status}`,
        resource: `${task.key} · ${task.title}`,
        category: "Task snapshot",
      }));
    const commentEvents: AuditEvent[] = state.comments
      .filter((comment) =>
        state.tasks.some(
          (task) => task.id === comment.taskId && task.workspaceId === state.activeWorkspaceId,
        ),
      )
      .map((comment) => ({
        id: comment.id,
        date: comment.createdAt,
        actor: members.find((member) => member.id === comment.authorId)?.name ?? "Workspace member",
        event: "Comment added",
        resource: state.tasks.find((task) => task.id === comment.taskId)?.key ?? "Task",
        category: "Comment",
      }));
    return [...taskEvents, ...commentEvents].sort((a, b) => b.date.localeCompare(a.date));
  }, [state.tasks, state.comments, state.activeWorkspaceId, members]);
  const filteredEvents = useMemo(() => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - Number(rangeDays));
    return events.filter((event) => {
      const date = new Date(`${event.date}T12:00:00`);
      return (
        (category === "All activity" || event.category === category) &&
        date >= minDate &&
        `${event.actor} ${event.event} ${event.resource}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    });
  }, [events, rangeDays, category, query]);
  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  const securitySettings = state.settingsByWorkspace[state.activeWorkspaceId]?.security;

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {workspace?.name} / Security
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Security &amp; audit preview
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            This browser demo has no security audit service, authentication sessions, SIEM stream,
            or network enforcement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(filteredEvents)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium"
          >
            <Icon name="download" />
            Export visible activity
          </button>
          <button
            type="button"
            disabled
            title="No SIEM integration is connected"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium opacity-50"
          >
            <Icon name="cell_tower" />
            SIEM unavailable
          </button>
          <button
            type="button"
            disabled
            title="No server sessions are tracked"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white opacity-50"
          >
            <Icon name="gavel" />
            Session revocation unavailable
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        The activity below is assembled from task and comment records. It is not a security audit
        log and does not prove who changed an task.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Visible activity records"
          value={String(filteredEvents.length)}
          note="From task snapshots and comments"
          icon="history"
        />
        <MetricCard
          label="Server sessions"
          value="Not tracked"
          note="No authentication service"
          icon="devices"
        />
        <MetricCard
          label="API principals"
          value="Not tracked"
          note="No API key service"
          icon="vpn_key"
        />
        <MetricCard
          label="Policy enforcement"
          value="Unavailable"
          note="Settings do not enforce access"
          icon="policy"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Panel>
          <PanelTitle
            title="Workspace activity records"
            trailing={<span className="text-xs text-muted">Not live</span>}
          />
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="audit-search">
              Search activity
            </label>
            <input
              id="audit-search"
              className="h-9 min-w-52 rounded-lg border border-border bg-white px-3 text-sm"
              placeholder="Search actor, event, task…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <label className="sr-only" htmlFor="audit-category">
              Activity category
            </label>
            <select
              id="audit-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm"
            >
              <option>All activity</option>
              <option>Task snapshot</option>
              <option>Comment</option>
            </select>
            <label className="sr-only" htmlFor="audit-range">
              Activity date range
            </label>
            <select
              id="audit-range"
              value={rangeDays}
              onChange={(event) => setRangeDays(event.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-outline">
                  {["Date", "Actor", "Event", "Resource", "Record type"].map((title) => (
                    <th key={title} scope="col" className="px-3 py-3 font-medium">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-3 text-xs text-muted">{event.date}</td>
                    <td className="px-3 py-3">{event.actor}</td>
                    <td className="px-3 py-3">{event.event}</td>
                    <td className="max-w-64 truncate px-3 py-3">{event.resource}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-surface-low px-2 py-1 text-xs">
                        {event.category}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">
                      No activity matches these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel>
            <PanelTitle title="Server sessions" />
            <p className="text-sm text-muted">
              Session data is not available because the frontend has no sign-in service.
            </p>
          </Panel>
          <Panel>
            <PanelTitle title="Workspace policy settings" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">MFA preference</dt>
                <dd>{securitySettings?.mfaRequired ? "On" : "Off"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Preferred regions</dt>
                <dd>{securitySettings?.allowedRegions.join(", ") || "None"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Session timeout preference</dt>
                <dd>{securitySettings?.sessionTimeoutMinutes ?? "—"} min</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              These are local display preferences; they do not enforce security policy.
            </p>
            <Link
              href="/settings"
              className="mt-3 inline-flex rounded-lg border border-border px-3 py-2 text-sm"
            >
              Manage demo settings
            </Link>
          </Panel>
        </div>
      </div>
    </main>
  );
}
