"use client";

import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { PriorityPill } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { Issue, WorkStatus } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const defaultColumns: WorkStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
const columnDot: Record<WorkStatus, string> = {
  Backlog: "bg-slate-400",
  "To Do": "bg-blue-500",
  "In Progress": "bg-accent",
  "In Review": "bg-amber-500",
  Done: "bg-green",
  Planned: "bg-slate-400",
};

export function KanbanBoard({ projectId }: { projectId: string }) {
  const state = useDemoState();
  const columns = (
    state.settingsByWorkspace[state.activeWorkspaceId]?.statuses ?? defaultColumns
  ).filter((status) => status !== "Planned");
  const [dragId, setDragId] = useState<string | null>(null);
  const [composer, setComposer] = useState<WorkStatus | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("All");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const project = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  const members = state.members.filter((member) => member.workspaceId === state.activeWorkspaceId);
  const issues = useMemo(
    () =>
      state.issues.filter(
        (issue) => issue.projectId === projectId && issue.workspaceId === state.activeWorkspaceId,
      ),
    [state.issues, projectId, state.activeWorkspaceId],
  );

  function moveIssue(destination: WorkStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!dragId) return;
    const issue = issues.find((item) => item.id === dragId);
    if (issue && issue.status !== destination)
      demoRepository.updateIssue(issue.id, { status: destination });
    setDragId(null);
  }

  function addIssue(event?: FormEvent) {
    event?.preventDefault();
    try {
      demoRepository.createIssue({
        projectId,
        title,
        status: composer ?? "In Progress",
        priority: "Medium",
        sprintId:
          state.sprints.find(
            (sprint) => sprint.projectId === projectId && sprint.status === "Active",
          )?.id ?? null,
      });
      setTitle("");
      setComposer(null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the issue.");
    }
  }

  if (!project)
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Project not found in this workspace</h1>
        <p className="mt-2 text-sm text-muted">
          Switch to the workspace that owns this project, or choose another project.
        </p>
        <Link className="mt-4 inline-block text-sm text-accent" href="/projects">
          View projects →
        </Link>
      </div>
    );

  const assignees = project.memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is NonNullable<typeof member> => !!member);

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      <div className="border-b border-border/50 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                <Link href="/projects" className="hover:text-accent">
                  {state.workspaces.find((item) => item.id === project.workspaceId)?.name}
                </Link>
                <span>/</span>
                <span className="font-mono text-accent">{project.key}</span>
                {state.sprints.some(
                  (sprint) => sprint.projectId === project.id && sprint.status === "Active",
                ) && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-green">
                    Sprint Active
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted">{project.description}</p>
              <div className="mt-3 flex items-center gap-1">
                {assignees.slice(0, 5).map((member, i) => (
                  <span
                    key={member.id}
                    title={member.name}
                    className={`grid size-7 place-items-center rounded-full border-2 border-white text-[9px] font-bold text-white ${["bg-accent", "bg-amber-500", "bg-green", "bg-violet-500", "bg-sky-600"][i % 5]}`}
                  >
                    {member.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/projects/${projectId}/settings`}
                className="flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-surface-low"
              >
                <Icon name="tune" size={16} />
                Project Settings
              </Link>
              <button
                onClick={() => setComposer("In Progress")}
                className="flex h-9 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
              >
                <Icon name="add" size={17} />
                Add Issue
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <nav className="flex gap-1 overflow-x-auto text-sm">
              {[
                ["Overview", "dashboard", `/projects/${projectId}`],
                ["Board", "view_kanban", `/projects/${projectId}/board`],
                ["Backlog", "format_list_bulleted", `/projects/${projectId}/sprints`],
                ["Sprints", "cycle", `/projects/${projectId}/sprints`],
                ["Roadmap", "timeline", `/projects/${projectId}/roadmap`],
                ["Members", "group", `/projects/${projectId}/members`],
                ["Settings", "settings", `/projects/${projectId}/settings`],
              ].map(([label, icon, href]) => (
                <Link
                  key={label}
                  href={href}
                  aria-current={label === "Board" ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 ${label === "Board" ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}
                >
                  <Icon name={icon} size={16} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Search issues</span>
                <Icon name="search" size={15} className="absolute left-2 top-2 text-outline" />
                <input
                  className="h-8 w-40 rounded-lg border border-border pl-7 pr-2 text-xs"
                  placeholder="Search issues"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="sr-only" htmlFor="priority-filter">
                Filter by priority
              </label>
              <select
                id="priority-filter"
                className="h-8 rounded-lg border border-border px-2 text-xs"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="All">Priority: All</option>
                <option>Urgent</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 overflow-x-auto p-4 sm:p-6">
        <div className="flex min-h-[500px] min-w-[1500px] gap-3">
          {columns.map((columnName) => {
            const cards = issues.filter(
              (issue) =>
                issue.status === columnName &&
                (priority === "All" || issue.priority === priority) &&
                `${issue.key} ${issue.title} ${issue.labels.join(" ")}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            );
            const composerOpen = composer === columnName;
            return (
              <section
                key={columnName}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => moveIssue(columnName, event)}
                className={`flex w-[292px] shrink-0 flex-col rounded-xl ${columnName === "In Progress" ? "bg-accent/5 ring-1 ring-accent/20" : "bg-surface-container/70"}`}
              >
                <header className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${columnDot[columnName]}`} />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">{columnName}</h2>
                    <span className="rounded-full bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {cards.length}
                    </span>
                  </div>
                  <button
                    aria-label={`Add issue to ${columnName}`}
                    onClick={() => {
                      setComposer(columnName);
                      setError("");
                    }}
                    className="rounded p-1 text-muted hover:bg-white"
                  >
                    <Icon name="add" size={16} />
                  </button>
                </header>
                <div className="flex-1 space-y-2 px-2 pb-2">
                  {composerOpen && (
                    <form
                      onSubmit={addIssue}
                      className="rounded-lg border border-accent/50 bg-white p-3 shadow-sm"
                    >
                      <textarea
                        autoFocus
                        required
                        minLength={3}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setComposer(null);
                        }}
                        className="w-full resize-none text-sm outline-none"
                        placeholder="What needs to be done?"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setComposer(null)}
                          className="text-xs text-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded bg-accent px-2 py-1 text-xs font-semibold text-white"
                        >
                          Add issue
                        </button>
                      </div>
                    </form>
                  )}
                  {cards.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      members={members}
                      columns={columns}
                      onDragStart={() => setDragId(issue.id)}
                      onDragEnd={() => setDragId(null)}
                      onError={setError}
                      dragging={dragId === issue.id}
                    />
                  ))}
                  {!cards.length && !composerOpen && (
                    <p className="rounded-lg border border-dashed border-border/80 p-4 text-center text-xs text-muted">
                      No issues in this column
                    </p>
                  )}
                </div>
                {columnName === "Done" && (
                  <footer className="border-t border-border/40 px-3 py-3 font-mono text-[10px] text-muted">
                    {issues
                      .filter((issue) => issue.status === "Done")
                      .reduce((sum, issue) => sum + issue.storyPoints, 0)}{" "}
                    story points complete
                  </footer>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  members,
  columns,
  onDragStart,
  onDragEnd,
  onError,
  dragging,
}: {
  issue: Issue;
  members: ReturnType<typeof useDemoState>["members"];
  columns: WorkStatus[];
  onDragStart: () => void;
  onDragEnd: () => void;
  onError: (value: string) => void;
  dragging: boolean;
}) {
  const assignee = members.find((member) => member.id === issue.assigneeId);
  function removeIssue() {
    if (!window.confirm(`Delete ${issue.key}? This will also remove its subtasks and comments.`))
      return;
    try {
      demoRepository.deleteIssue(issue.id);
      onError("");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Could not delete the issue.");
    }
  }
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-lg border border-border/50 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={`/issues/${issue.key}`}
          className="font-mono text-[10px] font-semibold text-accent hover:underline"
        >
          {issue.key}
        </Link>
        <details className="relative">
          <summary
            aria-label={`More actions for ${issue.key}`}
            className="grid size-6 cursor-pointer list-none place-items-center rounded text-muted hover:bg-surface-low"
          >
            <Icon name="more_horiz" size={15} />
          </summary>
          <button
            className="absolute right-0 z-10 w-28 rounded border border-border bg-white px-3 py-2 text-left text-xs text-red-700 shadow"
            onClick={removeIssue}
          >
            Delete issue
          </button>
        </details>
      </div>
      <Link
        href={`/issues/${issue.key}`}
        className="block text-sm font-medium leading-5 text-foreground hover:text-accent"
      >
        {issue.title}
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <PriorityPill priority={issue.priority} />
        <span className="flex items-center gap-1 font-mono text-[10px] text-outline">
          <Icon name="calendar_today" size={13} />
          {issue.dueDate
            ? new Date(`${issue.dueDate}T12:00:00Z`).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            : "No due date"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-surface-low pt-2">
        <label className="sr-only" htmlFor={`status-${issue.id}`}>
          Status for {issue.key}
        </label>
        <select
          id={`status-${issue.id}`}
          value={issue.status}
          onChange={(event) =>
            demoRepository.updateIssue(issue.id, { status: event.target.value as WorkStatus })
          }
          className="max-w-36 rounded bg-surface-low px-1.5 py-1 text-[10px]"
        >
          {columns.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <span
          title={assignee?.name ?? "Unassigned"}
          className="grid size-6 place-items-center rounded-full bg-accent/10 text-[9px] font-bold text-accent"
        >
          {assignee?.name
            .split(" ")
            .map((name) => name[0])
            .join("") ?? "—"}
        </span>
      </div>
    </article>
  );
}
