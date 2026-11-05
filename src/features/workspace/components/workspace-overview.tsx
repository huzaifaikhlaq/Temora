"use client";

import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import {
  MetricCard,
  Panel,
  PanelTitle,
  PriorityPill,
  StatusPill,
} from "@/components/shared/dashboard-ui";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

export function WorkspaceOverview() {
  const state = useDemoState();
  const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId);
  const member = state.members.find((item) => item.id === state.activeMemberId);
  const tasks = state.tasks.filter((task) => task.workspaceId === state.activeWorkspaceId);
  const projects = state.projects.filter(
    (project) => project.workspaceId === state.activeWorkspaceId && !project.archivedAt,
  );
  const myTasks = tasks
    .filter((task) => task.assigneeId === state.activeMemberId && task.status !== "Done")
    .slice(0, 5);
  const activeSprint = state.sprints.find(
    (sprint) => sprint.workspaceId === state.activeWorkspaceId && sprint.status === "Active",
  );
  const sprintTasks = activeSprint ? tasks.filter((task) => task.sprintId === activeSprint.id) : [];
  const sprintPoints = sprintTasks.reduce((sum, task) => sum + task.storyPoints, 0);
  const completedPoints = sprintTasks
    .filter((task) => task.status === "Done")
    .reduce((sum, task) => sum + task.storyPoints, 0);
  const overdue = tasks.filter(
    (task) =>
      task.status !== "Done" &&
      task.dueDate &&
      task.dueDate < new Date().toISOString().slice(0, 10),
  );
  const comments = state.comments
    .filter((item) => tasks.some((task) => task.id === item.taskId))
    .slice(-5)
    .reverse();

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            {workspace?.name ?? "Workspace"} · Demo workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Good morning, {member?.name ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Workspace snapshot for{" "}
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/projects"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm shadow-sm hover:bg-surface-high"
          >
            <Icon name="folder_special" size={16} />
            Projects
          </Link>
          <Link
            href="/tasks/new"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong"
          >
            <Icon name="add" size={17} />
            New Task
          </Link>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Projects"
          value={`${projects.length} active`}
          note={`${state.projects.filter((project) => project.workspaceId === state.activeWorkspaceId && project.archivedAt).length} archived`}
          icon="folder_open"
        />
        <MetricCard
          label="Open Tasks"
          value={`${tasks.filter((task) => task.status !== "Done").length} tasks`}
          note={`${myTasks.length} assigned to you`}
          icon="task_alt"
        />
        <MetricCard
          label="Sprint Velocity"
          value={sprintPoints ? `${Math.round((completedPoints / sprintPoints) * 100)}%` : "—"}
          note={activeSprint?.name ?? "No active sprint"}
          icon="bolt"
          tone="green"
        />
        <MetricCard
          label="Overdue Tasks"
          value={`${overdue.length} overdue`}
          note={overdue.length ? "Needs attention" : "All clear"}
          icon="warning"
          tone={overdue.length ? "red" : "green"}
        />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <Panel>
            <PanelTitle
              icon={<Icon name="checklist" />}
              title="My Priority Tasks"
              trailing={
                <span className="rounded-full bg-surface-high px-2.5 py-1 font-mono text-xs">
                  {myTasks.length}
                </span>
              }
            />
            <div className="divide-y divide-surface-low">
              {myTasks.length ? (
                myTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-3">
                    <button
                      aria-label={`Mark ${task.key} complete`}
                      onClick={() => demoRepository.updateTask(task.id, { status: "Done" })}
                      className="size-4 shrink-0 rounded border border-border bg-surface-low hover:border-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tasks/${task.key}`}
                        className="font-mono text-xs font-semibold text-accent"
                      >
                        {task.key}
                      </Link>
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      {task.parentTaskId && <p className="text-[10px] text-muted">Subtask</p>}
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <PriorityPill priority={task.priority} />
                      <StatusPill status={task.status} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-sm text-muted">No open tasks assigned to you.</p>
              )}
            </div>
            <Link
              href="/my-tasks"
              className="mt-3 block text-right text-xs font-semibold text-accent hover:underline"
            >
              View all assigned tasks →
            </Link>
          </Panel>
          <Panel>
            <PanelTitle title="Active Projects Progress" />
            <p className="-mt-3 mb-4 text-sm text-muted">
              Project health and delivery status for this workspace.
            </p>
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <article key={project.id} className="rounded-xl bg-surface-low p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${project.color}`} />
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold hover:text-accent"
                      >
                        {project.name}
                      </Link>
                      <span className="rounded bg-surface-high px-2 py-0.5 font-mono text-[10px] text-muted">
                        {project.category}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold">
                      {project.progress}% · {project.status}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${project.color}`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>
                      Lead:{" "}
                      {state.members.find((item) => item.id === project.leadId)?.name ??
                        "Unassigned"}
                    </span>
                    <span>
                      {
                        tasks.filter(
                          (task) => task.projectId === project.id && task.status !== "Done",
                        ).length
                      }{" "}
                      open tasks
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-5 xl:col-span-5">
          <Panel>
            <PanelTitle
              icon={<Icon name="cycle" />}
              title={activeSprint?.name ?? "Sprint health"}
              trailing={
                <Link
                  href={activeSprint ? `/projects/${activeSprint.projectId}/sprints` : "/projects"}
                  className="text-xs font-semibold text-accent"
                >
                  {activeSprint ? "View sprint" : "Open projects"}
                </Link>
              }
            />
            {activeSprint ? (
              <>
                <div className="rounded-lg bg-surface-low p-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-outline">
                    Sprint goal
                  </span>
                  <p className="mt-1 text-sm font-medium">
                    {activeSprint.goal || "No sprint goal set."}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {activeSprint.startDate} → {activeSprint.endDate} ·{" "}
                    {sprintTasks.filter((task) => task.status === "Done").length}/
                    {sprintTasks.length} tasks complete
                  </p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-high">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${sprintPoints ? Math.round((completedPoints / sprintPoints) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-right font-mono text-xs text-muted">
                  {completedPoints} / {sprintPoints} story points
                </p>
              </>
            ) : (
              <p className="py-4 text-sm text-muted">
                There is no active sprint in this workspace.
              </p>
            )}
          </Panel>
          <Panel>
            <PanelTitle
              title="Team Workload"
              trailing={<span className="font-mono text-xs text-outline">Open assigned tasks</span>}
            />
            <div className="space-y-3">
              {state.members
                .filter((item) => item.workspaceId === state.activeWorkspaceId)
                .map((person) => {
                  const assigned = tasks.filter(
                    (task) => task.assigneeId === person.id && task.status !== "Done",
                  ).length;
                  const capacity = Math.min(100, assigned * 12);
                  return (
                    <div key={person.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{person.name}</span>
                        <span className="font-mono text-xs text-accent">{assigned} tasks</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${capacity}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Panel>
          <Panel>
            <PanelTitle
              icon={<Icon name="history" />}
              title="Recent Activity"
              trailing={
                <Link href="/inbox" className="text-xs font-semibold text-accent">
                  Inbox
                </Link>
              }
            />
            {comments.length ? (
              <ol className="ml-2 space-y-4 border-l-2 border-surface-high pl-4">
                {comments.map((comment) => {
                  const task = tasks.find((item) => item.id === comment.taskId);
                  return (
                    <li className="relative text-sm leading-5" key={comment.id}>
                      <span className="absolute -left-[22px] top-1 size-3 rounded-full bg-accent ring-4 ring-white" />
                      <Link href={`/tasks/${task?.key}`} className="font-medium hover:text-accent">
                        {state.members.find((item) => item.id === comment.authorId)?.name ??
                          "Member"}
                      </Link>{" "}
                      commented on{" "}
                      <Link href={`/tasks/${task?.key}`} className="text-accent">
                        {task?.key}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{comment.body}</p>
                      <span className="mt-1 block font-mono text-[10px] text-outline">
                        {comment.createdAt}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-3 text-sm text-muted">Task comments and updates will appear here.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
