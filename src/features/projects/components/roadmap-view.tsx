"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const colors = [
  "bg-violet-600",
  "bg-emerald-600",
  "bg-sky-600",
  "bg-amber-500",
  "bg-indigo-600",
  "bg-teal-600",
];
const statusColors: Record<string, string> = {
  "In Progress": "bg-emerald-100 text-emerald-800",
  Planning: "bg-sky-100 text-sky-800",
  "In Review": "bg-amber-100 text-amber-800",
  Archived: "bg-slate-100 text-slate-700",
};

export function RoadmapView({ projectId }: { projectId?: string }) {
  const state = useDemoState();
  const timeline = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState("Month");
  const [offset, setOffset] = useState(0);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const activeProject = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  const projects = useMemo(
    () =>
      state.projects.filter(
        (item) =>
          item.workspaceId === state.activeWorkspaceId &&
          !item.archivedAt &&
          (projectId === undefined || item.id === projectId),
      ),
    [state.projects, state.activeWorkspaceId, projectId],
  );
  const now = new Date();
  const monthCount = scale === "Year" ? 12 : 6;
  const months = Array.from(
    { length: monthCount },
    (_, index) => new Date(now.getFullYear(), now.getMonth() + offset + index, 1),
  );
  const monthWidth = scale === "Year" ? 110 : scale === "Quarter" ? 180 : 210;
  const totalWidth = monthWidth * months.length;
  const rows = projects.map((project, index) => {
    const projectTasks = state.tasks.filter(
      (task) => task.projectId === project.id && task.workspaceId === state.activeWorkspaceId,
    );
    const topLevelTasks = projectTasks.filter((task) => !task.parentTaskId);
    const orderedTasks = topLevelTasks.flatMap((task) => [
      task,
      ...projectTasks.filter((child) => child.parentTaskId === task.id),
    ]);
    const orphanedSubtasks = projectTasks.filter(
      (task) =>
        task.parentTaskId && !projectTasks.some((parent) => parent.id === task.parentTaskId),
    );
    return { project, index, tasks: [...orderedTasks, ...orphanedSubtasks] };
  });
  const dueTasks = rows.flatMap((row) => row.tasks.filter((task) => task.dueDate));

  function positionFor(dateValue: string | null) {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T00:00:00`);
    const monthIndex =
      (date.getFullYear() - months[0].getFullYear()) * 12 + date.getMonth() - months[0].getMonth();
    if (monthIndex < 0 || monthIndex >= months.length) return null;
    const dayFraction =
      (date.getDate() - 1) / new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return (monthIndex + dayFraction) * monthWidth;
  }

  function exportRoadmap() {
    const records = [
      ["Project", "Key", "Status", "Progress", "Task", "Due date"],
      ...rows.flatMap(({ project, tasks }) =>
        tasks.length
          ? tasks.map((task) => [
              project.name,
              project.key,
              project.status,
              String(project.progress),
              task.key,
              task.dueDate ?? "",
            ])
          : [
              [
                project.name,
                project.key,
                project.status,
                String(project.progress),
                "",
                project.dueDate,
              ],
            ],
      ),
    ];
    const csv = records
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "temora-roadmap.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Roadmap CSV downloaded from current workspace demo data.");
  }

  function shareRoadmap() {
    if (!navigator.clipboard) {
      setNotice("Copy the address bar link to share this local preview.");
      return;
    }
    void navigator.clipboard.writeText(window.location.href).then(
      () => setNotice("Roadmap link copied."),
      () => setNotice("Copy the address bar link to share this local preview."),
    );
  }

  if (projectId && !activeProject) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <Link href="/projects" className="mt-3 inline-block text-accent">
          Back to projects →
        </Link>
      </main>
    );
  }

  const navigationProject = activeProject ?? projects[0];

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      <header className="border-b border-border/50 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs text-muted">
              {state.workspaces.find((item) => item.id === state.activeWorkspaceId)?.name} /
              Projects / {activeProject?.name ?? "All projects"}
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {activeProject ? `${activeProject.name} roadmap` : "Workspace roadmap"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Project progress and task due dates from this workspace’s demo data.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={shareRoadmap}
              className="flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm"
            >
              <Icon name="share" size={16} />
              Share
            </button>
            <button
              onClick={exportRoadmap}
              className="flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm"
            >
              <Icon name="file_download" size={16} />
              Export CSV
            </button>
            <Link
              href="/projects"
              className="flex h-9 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-white"
            >
              <Icon name="add" size={16} />
              New project
            </Link>
          </div>
        </div>
        {notice && (
          <p role="status" className="mt-3 text-sm text-accent">
            {notice}
          </p>
        )}
        <nav className="mt-3 flex gap-4 overflow-x-auto text-sm">
          {[
            [
              "Overview",
              "dashboard",
              activeProject ? `/projects/${activeProject.id}` : "/projects",
            ],
            [
              "Board",
              "view_kanban",
              navigationProject ? `/projects/${navigationProject.id}/board` : "/projects",
            ],
            [
              "Sprints",
              "cycle",
              navigationProject ? `/projects/${navigationProject.id}/sprints` : "/projects",
            ],
            [
              "Roadmap",
              "timeline",
              navigationProject ? `/projects/${navigationProject.id}/roadmap` : "/projects",
            ],
          ].map(([label, icon, href]) => (
            <Link
              key={label}
              href={href}
              className={`flex shrink-0 items-center gap-1 border-b-2 py-2 ${label === "Roadmap" ? "border-accent font-semibold text-accent" : "border-transparent text-muted"}`}
            >
              <Icon name={icon} size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-white px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-surface-high p-0.5">
            {["Month", "Quarter", "Year"].map((option) => (
              <button
                key={option}
                onClick={() => setScale(option)}
                className={`rounded-md px-3 py-1.5 text-xs ${scale === option ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOffset((value) => value - 1)}
            aria-label="Previous period"
            className="h-8 rounded-lg border border-border px-2.5 text-sm"
          >
            ‹
          </button>
          <span className="font-mono text-xs text-muted">
            {months[0].toLocaleDateString(undefined, { month: "short", year: "numeric" })} –{" "}
            {months[months.length - 1].toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => setOffset((value) => value + 1)}
            aria-label="Next period"
            className="h-8 rounded-lg border border-border px-2.5 text-sm"
          >
            ›
          </button>
          <button
            onClick={() => {
              setOffset(0);
              timeline.current?.scrollTo({ left: 0, behavior: "smooth" });
            }}
            className="h-8 rounded-lg border border-border px-2.5 text-xs font-medium text-accent"
          >
            Jump to today
          </button>
        </div>
        <span className="text-xs text-muted">
          {rows.length} projects · {dueTasks.length} dated tasks
        </span>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden" id="roadmap">
        <aside className="hidden w-[340px] shrink-0 flex-col border-r border-border/50 bg-white md:flex">
          <div className="grid h-[62px] grid-cols-[1fr_62px_72px] items-center border-b border-border/50 bg-surface-low px-4 text-[10px] font-semibold uppercase tracking-wider text-outline">
            <span>Projects &amp; Tasks</span>
            <span>Progress</span>
            <span>Status</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rows.map(({ project, index, tasks }) => (
              <section key={project.id} className="border-b border-surface-low">
                <div className="grid min-h-[76px] grid-cols-[1fr_62px_72px] items-center gap-1 px-3">
                  <button
                    onClick={() =>
                      setCollapsed((current) =>
                        current.includes(project.id)
                          ? current.filter((id) => id !== project.id)
                          : [...current, project.id],
                      )
                    }
                    className="flex min-w-0 items-center gap-1.5 text-left"
                  >
                    <Icon
                      name={collapsed.includes(project.id) ? "chevron_right" : "expand_more"}
                      size={16}
                      className="shrink-0 text-muted"
                    />
                    <span
                      className={`size-3 shrink-0 rounded-full ${colors[index % colors.length]}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{project.name}</span>
                      <span className="block truncate font-mono text-[10px] text-outline">
                        {project.key} ·{" "}
                        {state.members.find((member) => member.id === project.leadId)?.name ??
                          "No lead"}
                      </span>
                    </span>
                  </button>
                  <span className="font-mono text-[10px] font-semibold">{project.progress}%</span>
                  <span
                    className={`truncate rounded px-1.5 py-1 text-center text-[9px] font-semibold ${statusColors[project.status] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {project.status}
                  </span>
                </div>
                {!collapsed.includes(project.id) &&
                  tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.key}`}
                      className={`flex items-center gap-2 border-t border-surface-low bg-surface-low/30 py-2 text-[10px] text-muted hover:text-accent ${task.parentTaskId ? "pl-11 pr-7" : "px-7"}`}
                    >
                      <Icon name="subdirectory_arrow_right" size={13} />
                      <span className="font-mono text-accent">{task.key}</span>
                      {task.parentTaskId && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                          Subtask
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      <span className="font-mono">{task.dueDate ?? "No due date"}</span>
                    </Link>
                  ))}
              </section>
            ))}
          </div>
          <div className="flex items-center justify-between bg-surface-low px-4 py-3 text-xs">
            <span className="flex items-center gap-2 font-semibold">
              <Icon name="analytics" size={17} className="text-accent" />
              Project completion
            </span>
            <span className="font-mono font-bold text-accent">
              {rows.length
                ? Math.round(rows.reduce((sum, row) => sum + row.project.progress, 0) / rows.length)
                : 0}
              % avg
            </span>
          </div>
        </aside>
        <div ref={timeline} className="min-w-0 flex-1 overflow-auto bg-white">
          <div className="relative min-h-full" style={{ minWidth: totalWidth }}>
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur">
              <div
                className="grid divide-x divide-surface-container text-center font-mono text-[11px] font-semibold text-muted"
                style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
              >
                {months.map((month) => (
                  <div
                    key={month.toISOString()}
                    className={`flex h-8 items-center justify-center ${month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear() ? "bg-accent/5 text-accent" : ""}`}
                  >
                    {month.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </div>
                ))}
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 top-8 z-0 grid divide-x divide-surface-container"
              style={{
                height: `${rows.reduce((sum, row) => sum + 76 + row.tasks.length * 32, 0)}px`,
                gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`,
              }}
            >
              {months.map((month) => (
                <i
                  key={month.toISOString()}
                  className={
                    month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear()
                      ? "bg-accent/[0.025]"
                      : ""
                  }
                />
              ))}
            </div>
            <div className="relative z-10">
              {rows.map(({ project, index, tasks }) => {
                const duePosition = positionFor(project.dueDate);
                const todayPosition = positionFor(now.toISOString().slice(0, 10));
                return (
                  <section key={project.id} className="border-b border-surface-container">
                    <div className="relative h-[76px]">
                      {duePosition !== null &&
                      todayPosition !== null &&
                      duePosition >= todayPosition ? (
                        <div
                          className={`absolute top-5 flex h-9 items-center justify-between overflow-hidden rounded-md px-3 text-white shadow-sm ${colors[index % colors.length]}`}
                          style={{
                            left: todayPosition,
                            width: Math.max(24, duePosition - todayPosition),
                          }}
                        >
                          <span className="truncate text-xs font-semibold">{project.name}</span>
                          <span className="ml-2 shrink-0 font-mono text-[10px] font-bold">
                            {project.progress}%
                          </span>
                          <span
                            className="absolute inset-y-0 left-0 -z-0 bg-black/15"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      ) : (
                        <p className="absolute left-3 top-6 text-xs text-muted">
                          {project.dueDate
                            ? `Due ${project.dueDate} · outside this view`
                            : "No due date set"}
                        </p>
                      )}
                    </div>
                    {!collapsed.includes(project.id) &&
                      tasks.map((task) => {
                        const taskPosition = positionFor(task.dueDate);
                        return (
                          <div
                            key={task.id}
                            className="relative h-8 border-t border-surface-low/70 bg-surface-low/20"
                          >
                            {taskPosition !== null && (
                              <Link
                                href={`/tasks/${task.key}`}
                                className="absolute top-1 flex h-6 items-center gap-2 overflow-hidden rounded bg-indigo-100 px-2 font-mono text-[9px] text-indigo-950"
                                style={{
                                  left: Math.min(taskPosition, totalWidth - 180),
                                  width: 180,
                                }}
                              >
                                <span className="font-semibold">{task.key}</span>
                                <span className="truncate">{task.title}</span>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                  </section>
                );
              })}
            </div>
            {positionFor(now.toISOString().slice(0, 10)) !== null && (
              <div
                className="pointer-events-none absolute bottom-0 z-20 flex w-0.5 flex-col items-center bg-accent/80"
                style={{ left: positionFor(now.toISOString().slice(0, 10)) ?? 0, top: 0 }}
              >
                <span className="sticky top-10 mt-10 -ml-1 w-28 -translate-x-1/2 rounded-full bg-accent px-2 py-1 text-center font-mono text-[9px] font-bold text-white">
                  Today · {now.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 bg-white px-4 py-3 text-xs sm:px-6">
        <span className="font-mono text-outline">
          Projects: <strong className="text-foreground">{rows.length}</strong> · Tasks with due
          dates: <strong className="text-foreground">{dueTasks.length}</strong>
        </span>
        <span className="text-muted">
          Timeline uses project and task due dates in this workspace.
        </span>
      </footer>
    </div>
  );
}
