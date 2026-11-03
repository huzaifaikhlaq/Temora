"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { Panel, PriorityPill, StatusPill } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { Sprint, WorkStatus } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const issueStatuses: WorkStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
const input =
  "h-9 rounded-lg border border-border bg-white px-2.5 text-sm outline-none focus:border-accent";

export function SprintPlanning({ projectId = "website-redesign" }: { projectId?: string }) {
  const state = useDemoState();
  const project = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sprints = state.sprints
    .filter(
      (sprint) => sprint.projectId === projectId && sprint.workspaceId === state.activeWorkspaceId,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const activeSprint = sprints.find((sprint) => sprint.status === "Active");
  const issues = state.issues.filter(
    (issue) => issue.projectId === projectId && issue.workspaceId === state.activeWorkspaceId,
  );
  const backlog = useMemo(
    () =>
      issues.filter(
        (issue) =>
          !issue.sprintId &&
          `${issue.key} ${issue.title}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [issues, query],
  );
  const activeIssues = activeSprint
    ? issues.filter((issue) => issue.sprintId === activeSprint.id)
    : [];
  const totalPoints = activeIssues.reduce((sum, issue) => sum + issue.storyPoints, 0);
  const donePoints = activeIssues
    .filter((issue) => issue.status === "Done")
    .reduce((sum, issue) => sum + issue.storyPoints, 0);

  function createSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    try {
      demoRepository.createSprint({
        projectId,
        name,
        goal,
        startDate,
        endDate,
        capacityPoints: 40,
      });
      setName("");
      setGoal("");
      setEndDate("");
      setCreating(false);
      setNotice("Sprint created in this browser’s demo workspace.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create sprint.");
    }
  }
  function updateIssue(issueId: string, patch: Parameters<typeof demoRepository.updateIssue>[1]) {
    try {
      demoRepository.updateIssue(issueId, patch);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update issue.");
    }
  }
  function addToSprint(issueId: string, sprintId: string) {
    if (!sprintId) return;
    updateIssue(issueId, { sprintId });
    setNotice("Issue added to sprint.");
  }

  if (!project)
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <Link href="/projects" className="mt-3 inline-block text-accent">
          Back to projects →
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-[1540px] space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/projects/${project.id}`}>{project.name}</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">{project.key}</span>
            {activeSprint && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-green">
                {activeSprint.name} active
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Sprint planning &amp; backlog</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${project.id}/settings`}
            className="h-9 rounded-lg border border-border px-3 py-2 text-sm"
          >
            Project settings
          </Link>
          {activeSprint && (
            <Link
              href={`/sprints/${activeSprint.id}/complete`}
              className="h-9 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Complete sprint
            </Link>
          )}
          <button
            onClick={() => setCreating(true)}
            className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
          >
            Create sprint
          </button>
        </div>
      </header>
      <nav className="flex gap-5 border-b border-border/50 text-sm">
        {[
          ["Overview", `/projects/${project.id}`],
          ["Board", `/projects/${project.id}/board`],
          ["Sprints & Backlog", `/projects/${project.id}/sprints`],
          ["Roadmap", `/projects/${project.id}/roadmap`],
        ].map(([tab, href]) => (
          <Link
            key={tab}
            href={href}
            className={`border-b-2 py-2 ${tab === "Sprints & Backlog" ? "border-accent font-semibold text-accent" : "border-transparent text-muted"}`}
          >
            {tab}
          </Link>
        ))}
      </nav>
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {activeSprint ? (
        <Panel className="bg-accent text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/70">
                {activeSprint.name}
                <span className="rounded-full bg-white/20 px-2 py-0.5">Active</span>
              </div>
              <h2 className="mt-1 text-xl font-semibold">Ends {activeSprint.endDate}</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                {activeSprint.goal || "No sprint goal set."}
              </p>
            </div>
            <Icon name="cycle" size={34} className="text-white/70" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Points done", `${donePoints} / ${totalPoints} pts`],
              [
                "Issues",
                `${activeIssues.filter((issue) => issue.status === "Done").length} / ${activeIssues.length} done`,
              ],
              ["Capacity", `${activeSprint.capacityPoints} pts`],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-white/10 p-3" key={label}>
                <div className="text-xs text-white/70">{label}</div>
                <div className="mt-2 text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: `${totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0}%`,
              }}
            />
          </div>
        </Panel>
      ) : (
        <Panel>
          <h2 className="font-semibold">No active sprint</h2>
          <p className="mt-1 text-sm text-muted">
            Start a planned sprint to begin tracking its issues.
          </p>
        </Panel>
      )}
      <section className="space-y-4">
        {sprints.map((sprint) => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            issues={issues.filter((issue) => issue.sprintId === sprint.id)}
            canStart={!activeSprint && sprint.status === "Planned"}
            backlog={backlog}
            onStart={() => {
              try {
                demoRepository.startSprint(sprint.id);
                setNotice(`${sprint.name} started.`);
                setError("");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not start sprint.");
              }
            }}
            onUpdateIssue={updateIssue}
            onAddIssue={addToSprint}
          />
        ))}
      </section>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Product backlog{" "}
              <span className="ml-1 rounded-full bg-surface-high px-2 font-mono text-xs">
                {backlog.length} issues
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted">Unscheduled work in {project.name}.</p>
          </div>
          <div className="flex gap-2">
            <input
              aria-label="Search backlog"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search backlog"
              className={`${input} w-48`}
            />
            <Link
              href={`/issues/new?projectId=${encodeURIComponent(project.id)}`}
              className="h-9 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Create issue
            </Link>
          </div>
        </div>
        <div className="mt-3 divide-y divide-surface-low">
          {backlog.map((issue) => (
            <div key={issue.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <Link
                href={`/issues/${issue.key}`}
                className="font-mono text-xs font-semibold text-accent"
              >
                {issue.key}
              </Link>
              <Link href={`/issues/${issue.key}`} className="min-w-48 flex-1">
                {issue.title}
              </Link>
              <span className="text-xs text-muted">{issue.storyPoints} SP</span>
              <PriorityPill priority={issue.priority} />
              <span className="text-xs text-muted">
                {state.members.find((member) => member.id === issue.assigneeId)?.name ??
                  "Unassigned"}
              </span>
              <select
                aria-label={`Move ${issue.key} to sprint`}
                defaultValue=""
                onChange={(event) => addToSprint(issue.id, event.target.value)}
                className="h-8 rounded border border-border bg-white px-2 text-xs"
              >
                <option value="">Add to sprint…</option>
                {sprints
                  .filter((sprint) => sprint.status !== "Closed")
                  .map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
        {backlog.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No backlog issues match this search.
          </p>
        )}
      </Panel>
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={createSprint}
            className="w-full max-w-xl space-y-4 rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Create sprint</h2>
                <p className="mt-1 text-sm text-muted">
                  For {project.name} · Changes stay in this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
                aria-label="Close"
                className="text-muted"
              >
                ×
              </button>
            </div>
            <label className="block text-sm font-medium">
              Sprint name
              <input
                required
                minLength={2}
                className={`${input} mt-1 w-full`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Sprint 26"
              />
            </label>
            <label className="block text-sm font-medium">
              Goal
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-border p-3 text-sm"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Start
                <input
                  required
                  type="date"
                  className={`${input} mt-1 w-full`}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                End
                <input
                  required
                  type="date"
                  className={`${input} mt-1 w-full`}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
                Create sprint
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function SprintSection({
  sprint,
  issues,
  canStart,
  backlog,
  onStart,
  onUpdateIssue,
  onAddIssue,
}: {
  sprint: Sprint;
  issues: ReturnType<typeof useDemoState>["issues"];
  canStart: boolean;
  backlog: ReturnType<typeof useDemoState>["issues"];
  onStart: () => void;
  onUpdateIssue: (id: string, patch: Parameters<typeof demoRepository.updateIssue>[1]) => void;
  onAddIssue: (issueId: string, sprintId: string) => void;
}) {
  const state = useDemoState();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal);
  const [startDate, setStartDate] = useState(sprint.startDate);
  const [endDate, setEndDate] = useState(sprint.endDate);
  const [error, setError] = useState("");
  const total = issues.reduce((sum, issue) => sum + issue.storyPoints, 0);
  const completed = issues
    .filter((issue) => issue.status === "Done")
    .reduce((sum, issue) => sum + issue.storyPoints, 0);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      demoRepository.updateSprint(sprint.id, { name, goal, startDate, endDate });
      setEditing(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update sprint.");
    }
  }
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div>
          <h2 className="font-semibold">
            {sprint.name}
            <span
              className={`ml-2 rounded px-2 py-0.5 font-mono text-[10px] ${sprint.status === "Active" ? "bg-emerald-100 text-green" : "bg-surface-high text-muted"}`}
            >
              {sprint.status}
            </span>
          </h2>
          <p className="mt-1 text-xs text-muted">
            {sprint.startDate} – {sprint.endDate} · {goal || "No goal set"}
          </p>
        </div>
        <div className="flex gap-2">
          {sprint.status === "Planned" && (
            <button
              onClick={onStart}
              disabled={!canStart}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Start sprint
            </button>
          )}
          {sprint.status === "Active" && (
            <Link
              href={`/sprints/${sprint.id}/complete`}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
            >
              Complete
            </Link>
          )}
          <button
            onClick={() => setEditing((value) => !value)}
            className="rounded-lg border border-border px-3 py-2 text-xs"
          >
            Edit
          </button>
        </div>
      </header>
      {editing && (
        <form
          onSubmit={save}
          className="grid gap-2 border-b border-border bg-surface-low p-3 sm:grid-cols-2"
        >
          <label className="text-xs">
            Name
            <input
              className={`${input} mt-1 w-full`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="text-xs">
            Goal
            <input
              className={`${input} mt-1 w-full`}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>
          <label className="text-xs">
            Start date
            <input
              type="date"
              className={`${input} mt-1 w-full`}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="text-xs">
            End date
            <input
              type="date"
              className={`${input} mt-1 w-full`}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <button className="h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-white sm:col-span-2 sm:justify-self-end">
            Save sprint
          </button>
        </form>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-low px-4 py-2 text-xs">
        <span>
          <strong>Sprint Goal:</strong> {sprint.goal || "No goal set"}
        </span>
        <span className="font-mono text-accent">
          {completed} / {total} SP completed · {sprint.capacityPoints} SP capacity
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[105px_minmax(270px,1fr)_130px_60px_95px_105px_110px] gap-3 border-b border-surface-low px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-outline">
            <span>Key</span>
            <span>Title</span>
            <span>Project</span>
            <span>SP</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Assignee</span>
          </div>
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="grid grid-cols-[105px_minmax(270px,1fr)_130px_60px_95px_105px_110px] items-center gap-3 border-b border-surface-low px-4 py-3 text-xs hover:bg-surface-low/70"
            >
              <Link href={`/issues/${issue.key}`} className="font-mono font-semibold text-accent">
                {issue.key}
              </Link>
              <Link href={`/issues/${issue.key}`} className="font-medium">
                {issue.title}
              </Link>
              <span className="truncate text-muted">
                {state.projects.find((project) => project.id === issue.projectId)?.name}
              </span>
              <span>{issue.storyPoints}</span>
              <PriorityPill priority={issue.priority} />
              <select
                aria-label={`${issue.key} status`}
                value={issue.status}
                onChange={(event) =>
                  onUpdateIssue(issue.id, { status: event.target.value as WorkStatus })
                }
                className="rounded border border-border bg-white px-1 py-1 text-[10px]"
              >
                {issueStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select
                aria-label={`${issue.key} assignee`}
                value={issue.assigneeId ?? ""}
                onChange={(event) =>
                  onUpdateIssue(issue.id, { assigneeId: event.target.value || null })
                }
                className="max-w-28 rounded border border-border bg-white px-1 py-1 text-[10px]"
              >
                <option value="">Unassigned</option>
                {state.members
                  .filter((member) => member.workspaceId === issue.workspaceId)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <select
          aria-label={`Add backlog issue to ${sprint.name}`}
          defaultValue=""
          onChange={(event) => onAddIssue(event.target.value, sprint.id)}
          className={`${input} max-w-sm`}
        >
          <option value="">Add backlog issue…</option>
          {backlog.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.key} · {issue.title}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          {issues.length} issues · {total} points
        </span>
      </div>
    </section>
  );
}
