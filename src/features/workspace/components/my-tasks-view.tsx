"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Panel, PriorityPill, StatusPill } from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import type { WorkStatus } from "@/features/workspace/data/model";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const statuses: WorkStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

export function MyTasksView() {
  const state = useDemoState();
  const [tab, setTab] = useState<"List" | "Board" | "Calendar">("List");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("All");
  const [projectId, setProjectId] = useState("All projects");
  const tasks = useMemo(
    () =>
      state.tasks.filter(
        (task) =>
          task.workspaceId === state.activeWorkspaceId &&
          task.assigneeId === state.activeMemberId &&
          (projectId === "All projects" || task.projectId === projectId) &&
          (priority === "All" || task.priority === priority) &&
          `${task.key} ${task.title}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [state.tasks, state.activeWorkspaceId, state.activeMemberId, projectId, priority, query],
  );
  const open = tasks.filter((task) => task.status !== "Done");
  const completed = state.tasks.filter(
    (task) =>
      task.workspaceId === state.activeWorkspaceId &&
      task.assigneeId === state.activeMemberId &&
      task.status === "Done",
  );
  const assigned = state.members.find((member) => member.id === state.activeMemberId);
  const projects = state.projects.filter(
    (project) => project.workspaceId === state.activeWorkspaceId && !project.archivedAt,
  );
  const grouped =
    tab === "Board"
      ? statuses.map((status) => ({
          title: status,
          tasks: tasks.filter((task) => task.status === status),
        }))
      : [{ title: "Assigned to me", tasks: tasks }];

  return (
    <div className="mx-auto max-w-[1540px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-accent">
            <Icon name="assignment_ind" size={17} />
            Personal action queue
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            My Tasks{" "}
            <span className="ml-1 rounded-full bg-surface-high px-2.5 py-1 align-middle font-mono text-sm">
              {open.length} Active
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Personal action queue for {assigned?.name ?? "this workspace member"} ·{" "}
            {state.sprints.find(
              (sprint) =>
                sprint.workspaceId === state.activeWorkspaceId && sprint.status === "Active",
            )?.name ?? "Backlog"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/tasks/new"
            className="flex h-9 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
          >
            <Icon name="add_task" size={17} />
            New Task
          </Link>
          <div className="flex rounded-lg bg-surface-high p-0.5">
            {(["List", "Board", "Calendar"] as const).map((view, index) => (
              <button
                key={view}
                onClick={() => setTab(view)}
                className={`rounded-md px-3 py-1.5 text-xs ${tab === view ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
              >
                <span className="hidden sm:inline">{view}</span>
                <span className="sm:hidden">
                  <Icon
                    name={["format_list_bulleted", "view_kanban", "calendar_month"][index]}
                    size={16}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Assigned to me", String(open.length)],
          ["Urgent", String(open.filter((task) => task.priority === "Urgent").length)],
          ["Completed", String(completed.length)],
          ["Story points", `${open.reduce((sum, task) => sum + task.storyPoints, 0)} pts`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-3 shadow-sm">
            <span className="block text-xs text-muted">{label}</span>
            <span className="mt-1 block text-xl font-semibold">{value}</span>
          </div>
        ))}
      </div>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-48 flex-1">
            <Icon name="search" size={18} className="absolute left-2 top-2 text-outline" />
            <input
              aria-label="Search my tasks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-border/60 pl-8 pr-3 text-sm outline-none focus:border-accent"
              placeholder="Search tasks…"
            />
          </label>
          <select
            aria-label="Filter by project"
            className="h-9 rounded-lg border border-border px-3 text-sm"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option>All projects</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            className="h-9 rounded-lg border border-border px-3 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {["All", "Urgent", "High", "Medium", "Low"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 border-b border-surface-low pb-3 text-xs text-muted">
          <span>
            Open <strong className="ml-1 text-accent">{open.length}</strong>
          </span>
          <span>
            Done <strong className="ml-1 text-green">{completed.length}</strong>
          </span>
          <span>{tasks.length} matching tasks</span>
        </div>
        {tab === "Calendar" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks
              .filter((task) => task.dueDate)
              .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
              .map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.key}`}
                  className="rounded-lg border border-border p-3 hover:border-accent"
                >
                  <span className="font-mono text-xs text-accent">{task.dueDate}</span>
                  <p className="mt-1 font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {task.key} · {task.status}
                  </p>
                </Link>
              ))}
          </div>
        ) : (
          <div className={`mt-4 ${tab === "Board" ? "grid gap-3 xl:grid-cols-5" : "space-y-4"}`}>
            {grouped.map((group) => (
              <section
                key={group.title}
                className={tab === "Board" ? "min-w-0 rounded-lg bg-surface-low p-2" : ""}
              >
                <div className="flex items-center gap-2 border-t border-surface-low py-2 text-xs">
                  <span className="font-semibold">{group.title}</span>
                  <span className="rounded-full bg-surface-high px-1.5 font-mono">
                    {group.tasks.length}
                  </span>
                </div>
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-surface-low py-3 sm:grid-cols-[minmax(0,1.7fr)_1fr_110px_90px_64px_auto]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <button
                        aria-label={`Mark ${task.key} complete`}
                        onClick={() => demoRepository.updateTask(task.id, { status: "Done" })}
                        className="size-4 shrink-0 rounded border border-border bg-white hover:border-accent"
                      />
                      <Link href={`/tasks/${task.key}`} className="min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-accent">
                          {task.key}
                        </span>
                        <span className="ml-2 truncate text-sm font-medium">{task.title}</span>
                      </Link>
                    </span>
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="hidden truncate text-xs text-muted hover:text-accent sm:block"
                    >
                      {projects.find((project) => project.id === task.projectId)?.name ??
                        "Project"}
                    </Link>
                    <span className="hidden sm:block">
                      <StatusPill status={task.status} />
                    </span>
                    <span className="hidden sm:block">
                      <PriorityPill priority={task.priority} />
                    </span>
                    <span className="text-xs text-muted">{task.dueDate ?? "—"}</span>
                    <select
                      aria-label={`${task.key} status`}
                      value={task.status}
                      onChange={(event) =>
                        demoRepository.updateTask(task.id, {
                          status: event.target.value as WorkStatus,
                        })
                      }
                      className="h-8 rounded border border-border bg-white px-1 text-xs"
                    >
                      <option value={task.status}>{task.status}</option>
                      {statuses
                        .filter((status) => status !== task.status)
                        .map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                    </select>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
        {tasks.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No tasks match these filters.</p>
        )}
      </Panel>
    </div>
  );
}
