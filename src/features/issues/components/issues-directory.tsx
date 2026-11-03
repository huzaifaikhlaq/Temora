"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { WorkStatus } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const statuses = ["Backlog", "To Do", "In Progress", "In Review", "Done"] as const;
const priorities = ["Urgent", "High", "Medium", "Low"] as const;

export function IssuesDirectory() {
  const state = useDemoState();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");
  const [project, setProject] = useState("All projects");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const projects = state.projects.filter(
    (item) => item.workspaceId === state.activeWorkspaceId && !item.archivedAt,
  );
  const issues = useMemo(
    () =>
      state.issues.filter(
        (issue) =>
          issue.workspaceId === state.activeWorkspaceId &&
          (project === "All projects" || issue.projectId === project) &&
          (status === "All statuses" || issue.status === status) &&
          (priority === "All priorities" || issue.priority === priority) &&
          `${issue.key} ${issue.title} ${issue.labels.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [state.issues, state.activeWorkspaceId, project, status, priority, query],
  );

  function setSelectedStatus(nextStatus: WorkStatus) {
    selected.forEach((issueId) => demoRepository.updateIssue(issueId, { status: nextStatus }));
    setSelected([]);
    setNotice(`Selected issues moved to ${nextStatus}.`);
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {state.workspaces.find((item) => item.id === state.activeWorkspaceId)?.name} / Workspace
            issues
          </p>
          <h1 className="mt-1 text-2xl font-bold">All issues</h1>
          <p className="mt-1 text-sm text-muted">
            Search and review issues across your active projects.
          </p>
        </div>
        <Link
          href="/issues/new"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
        >
          <Icon name="add" />
          Create issue
        </Link>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Total issues"
          value={String(
            state.issues.filter((issue) => issue.workspaceId === state.activeWorkspaceId).length,
          )}
        />
        <Metric
          label="In progress"
          value={String(
            state.issues.filter(
              (issue) =>
                issue.workspaceId === state.activeWorkspaceId && issue.status === "In Progress",
            ).length,
          )}
        />
        <Metric
          label="High priority"
          value={String(
            state.issues.filter(
              (issue) =>
                issue.workspaceId === state.activeWorkspaceId &&
                (issue.priority === "High" || issue.priority === "Urgent"),
            ).length,
          )}
        />
      </div>
      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <input
            aria-label="Search issues"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search key, summary, or label…"
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-border px-3 text-sm"
          />
          <select
            aria-label="Filter by project"
            className="h-9 rounded-lg border border-border px-2 text-sm"
            value={project}
            onChange={(event) => setProject(event.target.value)}
          >
            <option>All projects</option>
            {projects.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-border px-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>All statuses</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            className="h-9 rounded-lg border border-border px-2 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option>All priorities</option>
            {priorities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-accent/5 px-4 py-2 text-sm">
            <strong>{selected.length} selected</strong>
            <select
              aria-label="Move selected issues"
              className="h-8 rounded border border-border bg-white px-2"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) setSelectedStatus(event.target.value as WorkStatus);
              }}
            >
              <option value="">Change status…</option>
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button onClick={() => setSelected([])} className="text-muted">
              Clear
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase tracking-wide text-muted">
              <tr>
                {["", "Key", "Summary", "Project", "Status", "Priority", "Assignee", "Sprint"].map(
                  (item, index) => (
                    <th key={item || index} className="px-3 py-3 font-medium">
                      {item}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} className="border-t border-border/70 hover:bg-surface-low/50">
                  <td className="px-3 py-3">
                    <input
                      aria-label={`Select ${issue.key}`}
                      type="checkbox"
                      checked={selected.includes(issue.id)}
                      onChange={(event) =>
                        setSelected((items) =>
                          event.target.checked
                            ? [...items, issue.id]
                            : items.filter((id) => id !== issue.id),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      className="font-mono text-xs font-semibold text-accent"
                      href={`/issues/${issue.key}`}
                    >
                      {issue.key}
                    </Link>
                  </td>
                  <td className="max-w-sm px-3 py-3">
                    <Link className="font-medium hover:text-accent" href={`/issues/${issue.key}`}>
                      {issue.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{issue.labels.join(" · ")}</p>
                  </td>
                  <td className="px-3 py-3">
                    {projects.find((item) => item.id === issue.projectId)?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`${issue.key} status`}
                      className="rounded border border-border bg-white px-2 py-1 text-xs"
                      value={issue.status}
                      onChange={(event) =>
                        demoRepository.updateIssue(issue.id, {
                          status: event.target.value as WorkStatus,
                        })
                      }
                    >
                      {statuses.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`${issue.key} priority`}
                      className="rounded border border-border bg-white px-2 py-1 text-xs"
                      value={issue.priority}
                      onChange={(event) =>
                        demoRepository.updateIssue(issue.id, {
                          priority: event.target.value as typeof issue.priority,
                        })
                      }
                    >
                      {priorities.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    {state.members.find((member) => member.id === issue.assigneeId)?.name ??
                      "Unassigned"}
                  </td>
                  <td className="px-3 py-3">
                    {state.sprints.find((sprint) => sprint.id === issue.sprintId)?.name ??
                      "Backlog"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {issues.length === 0 && (
          <div className="p-10 text-center">
            <h2 className="font-semibold">No matching issues</h2>
            <p className="mt-1 text-sm text-muted">
              Change the filters or create an issue for this project.
            </p>
            <Link
              className="mt-3 inline-block text-sm font-semibold text-accent"
              href="/issues/new"
            >
              Create issue →
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted">
          <span>
            Showing {issues.length} of{" "}
            {state.issues.filter((issue) => issue.workspaceId === state.activeWorkspaceId).length}{" "}
            issues
          </span>
          <span>Demo workspace data is stored in this browser.</span>
        </div>
      </section>
      {notice && (
        <p role="status" className="text-sm text-emerald-700">
          {notice}
        </p>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
