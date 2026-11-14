
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import { Icon } from "@/components/shared/icon";
import {
  MetricCard,
  Panel,
} from "@/components/shared/dashboard-ui";

import { workspaceApi } from "@/features/workspace/api/client";
import type { Workspace } from "@/features/workspace/types";

import {
  projectApi,
  type Project,
  type ProjectStatus,
} from "@/features/projects/api/client";

const control =
  "h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

const COLORS = [
  "bg-sky-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-indigo-600",
] as const;

function projectColor(id: string) {
  const index = parseInt(id.slice(0, 2), 16) % COLORS.length;
  return COLORS[index] ?? COLORS[0];
}

function formatDueDate(date: string | null) {
  if (!date) return "No due date";

  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    },
  );
}

export function ProjectsDirectory({
  startCreating = false,
}: {
  startCreating?: boolean;
}) {
  const [workspace, setWorkspace] =
    useState<Workspace | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [creating, setCreating] = useState(startCreating);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(
    "Product & Engineering",
  );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const canManage =
    workspace?.role === "owner" ||
    workspace?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [workspaces, selection] = await Promise.all([
        workspaceApi.list(),
        workspaceApi.selected(),
      ]);

      const active =
        workspaces.find(
          (item) => item.id === selection.workspace_id,
        ) ??
        workspaces[0] ??
        null;

      setWorkspace(active);

      if (active) {
        const result = await projectApi.list(active.id);
        setProjects(result);
      } else {
        setProjects([]);
      }

      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshProjects = async (workspaceId: string) => {
    const result = await projectApi.list(workspaceId);
    setProjects(result);
  };

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const matchesName = project.name
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchesFilter =
        filter === "All"
          ? !project.archived_at
          : filter === "Archived"
            ? !!project.archived_at
            : !project.archived_at &&
            STATUS_LABELS[project.status] === filter;

      return matchesName && matchesFilter;
    });
  }, [projects, query, filter]);

  const activeProjects = projects.filter(
    (project) => !project.archived_at,
  );

  const activeCount = activeProjects.filter(
    (project) => project.status === "in_progress",
  ).length;

  const categories = new Set(
    activeProjects.map((project) => project.category),
  );

  const overallProgress = Math.round(
    activeProjects.reduce(
      (total, project) => total + project.progress,
      0,
    ) / Math.max(activeProjects.length, 1),
  );

  async function createProject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!workspace || !canManage || busy) return;

    setBusy(true);
    setError("");

    try {
      const project = await projectApi.create(
        workspace.id,
        {
          name,
          category,
        },
      );

      await refreshProjects(workspace.id);

      setName("");
      setCategory("Product & Engineering");
      setCreating(false);
      setEditingId(project.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create the project.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archiveProject(projectId: string) {
    if (!workspace || !canManage || busy) return;

    if (
      !window.confirm(
        "Archive this project? You can restore it later.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await projectApi.archive(workspace.id, projectId);
      await refreshProjects(workspace.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not archive the project.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function restoreProject(projectId: string) {
    if (!workspace || !canManage || busy) return;

    setBusy(true);
    setError("");

    try {
      await projectApi.restore(workspace.id, projectId);
      await refreshProjects(workspace.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not restore the project.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading projects...
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-semibold">
          No workspace selected
        </h1>
        <p className="mt-2 text-sm text-muted">
          Create or join a workspace before creating projects.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {workspace.name} / Workspace
          </p>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Projects Directory
          </h1>

          <p className="mt-1 text-sm text-muted">
            Browse projects in this workspace and keep each team&apos;s work on track.
          </p>
        </div>

        {canManage && (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong"
            onClick={() => {
              setCreating(true);
              setError("");
            }}
          >
            <Icon name="add" />
            New Project
          </button>
        )}
      </header>

      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Projects"
          value={String(activeProjects.length)}
          note={`${activeCount} active`}
          icon="folder_special"
        />

        <MetricCard
          label="Active Initiatives"
          value={String(activeCount)}
          note={`Across ${categories.size} groups`}
          icon="bolt"
          tone="green"
        />

        <MetricCard
          label="Overall Progress"
          value={`${overallProgress}%`}
          note="Based on stored progress"
          icon="monitor_heart"
          tone="green"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap gap-2"
            aria-label="Project filters"
          >
            {[
              "All",
              "In Progress",
              "Planning",
              "In Review",
              "Completed",
              "Archived",
            ].map((status) => (
              <button
                key={status}
                aria-pressed={filter === status}
                className={`rounded-lg border px-3 py-2 text-sm ${filter === status
                    ? "border-accent bg-accent/5 font-semibold text-accent"
                    : "border-border text-muted hover:bg-surface-low"
                  }`}
                onClick={() => setFilter(status)}
              >
                {status === "All"
                  ? "All Projects"
                  : status}
              </button>
            ))}
          </div>

          <label className="relative">
            <span className="sr-only">Search projects</span>

            <Icon
              name="search"
              size={17}
              className="absolute left-2.5 top-2.5 text-outline"
            />

            <input
              className={`${control} pl-8`}
              placeholder="Search projects"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
            />
          </label>
        </div>

        {filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((project) => {
              const editing = editingId === project.id;
              const color = projectColor(project.id);

              return (
                <article
                  key={project.id}
                  className="rounded-xl border border-border/70 p-4 transition hover:border-accent/50 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${color} text-sm font-bold text-white`}
                    >
                      {project.key.slice(0, 3)}
                    </span>

                    <Link
                      href={`/projects/${project.id}`}
                      className="min-w-0 flex-1"
                    >
                      <strong className="block truncate hover:text-accent">
                        {project.name}
                      </strong>

                      <span className="text-xs text-muted">
                        {project.category} · {project.key}
                      </span>
                    </Link>

                    {canManage && (
                      <details className="relative">
                        <summary
                          aria-label={`${project.name} actions`}
                          className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-muted hover:bg-surface-low"
                        >
                          <Icon name="more_horiz" />
                        </summary>

                        <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-border bg-white p-1 shadow-lg">
                          {project.archived_at ? (
                            <button
                              disabled={busy}
                              className="w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-low"
                              onClick={() =>
                                void restoreProject(project.id)
                              }
                            >
                              Restore project
                            </button>
                          ) : (
                            <>
                              <Link
                                href={`/projects/${project.id}/settings`}
                                className="block rounded px-3 py-2 text-sm hover:bg-surface-low"
                              >
                                Project settings
                              </Link>

                              <Link
                                href={`/projects/${project.id}/members`}
                                className="block rounded px-3 py-2 text-sm hover:bg-surface-low"
                              >
                                Manage members
                              </Link>

                              <button
                                disabled={busy}
                                className="w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  void archiveProject(project.id)
                                }
                              >
                                Archive project
                              </button>
                            </>
                          )}
                        </div>
                      </details>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 text-xs">
                    <span className="rounded-md bg-surface-high px-2 py-1 text-muted">
                      {project.archived_at
                        ? "Archived"
                        : STATUS_LABELS[project.status]}
                    </span>

                    <span className="font-mono text-muted">
                      {project.progress}% complete ·{" "}
                      {formatDueDate(project.due_date)}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-high">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${project.progress}%`,
                      }}
                    />
                  </div>

                  {editing && (
                    <p
                      role="status"
                      className="mt-3 text-xs text-emerald-700"
                    >
                      Project created. Open the project to continue configuring it.
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted">
                      Workspace-scoped project
                    </span>

                    {project.archived_at ? (
                      <span className="text-xs text-muted">
                        Archived project
                      </span>
                    ) : (
                      <Link
                        href={`/projects/${project.id}/board`}
                        className="text-sm font-semibold text-accent hover:underline"
                      >
                        Open board{" "}
                        <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Icon
              name="folder_open"
              size={30}
              className="mx-auto text-outline"
            />

            <h2 className="mt-3 font-semibold">
              No projects match this view
            </h2>

            <p className="mt-1 text-sm text-muted">
              Adjust the filter or search, or create a new project.
            </p>

            <button
              className="mt-4 text-sm font-semibold text-accent"
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </Panel>

      {creating && canManage && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              !busy &&
              event.target === event.currentTarget
            ) {
              setCreating(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2
                id="new-project-title"
                className="text-lg font-semibold"
              >
                Create project
              </h2>

              <button
                aria-label="Close"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                <Icon name="close" />
              </button>
            </div>

            <p className="mt-1 text-sm text-muted">
              Create a project in {workspace.name}.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) =>
                void createProject(event)
              }
            >
              <label className="block text-sm font-medium">
                Project name

                <input
                  autoFocus
                  required
                  minLength={2}
                  className={`${control} mt-1 w-full`}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Customer Mobile App"
                />
              </label>

              <label className="block text-sm font-medium">
                Team / category

                <select
                  className={`${control} mt-1 w-full`}
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  <option>Product &amp; Engineering</option>
                  <option>Product Design</option>
                  <option>Mobile Engineering</option>
                  <option>Platform</option>
                  <option>Marketing</option>
                </select>
              </label>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="h-9 rounded-lg border border-border px-3 text-sm"
                  onClick={() =>
                    setCreating(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy
                    ? "Creating..."
                    : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
