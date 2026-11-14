
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

function projectKeyPreview(name: string) {
  const tokens = name.match(/[a-z]+|\d+(?:\.\d+)?/gi) ?? [];
  const letters = tokens
    .filter((token) => !/^\d/.test(token))
    .map((token) => token[0])
    .join("");
  const number = tokens.find((token) => /^\d/.test(token))?.replace(/\.0+$/, "") ?? "";
  return `${letters}${number}`.slice(0, 6).toUpperCase() || "AUTO";
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
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [creating, setCreating] = useState(startCreating);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

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
    const search = query.trim().toLowerCase();
    const result = projects.filter((project) => {
      const matchesSearch = [project.name, project.key, project.category]
        .some((value) => value.toLowerCase().includes(search));

      const matchesFilter =
        filter === "All"
          ? !project.archived_at
          : filter === "Archived"
            ? !!project.archived_at
            : !project.archived_at &&
            STATUS_LABELS[project.status] === filter;
      const matchesCategory =
        categoryFilter === "All" || project.category === categoryFilter;

      return matchesSearch && matchesFilter && matchesCategory;
    });

    return result.sort((first, second) => {
      if (sortBy === "Name") return first.name.localeCompare(second.name);
      if (sortBy === "Progress") return second.progress - first.progress;
      return second.created_at.localeCompare(first.created_at);
    });
  }, [projects, query, filter, categoryFilter, sortBy]);

  const activeProjects = projects.filter(
    (project) => !project.archived_at,
  );

  const activeCount = activeProjects.filter(
    (project) => project.status === "in_progress",
  ).length;

  const categories = new Set(
    activeProjects.map((project) => project.category).filter(Boolean),
  );
  const archivedCount = projects.filter((project) => !!project.archived_at).length;

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
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        },
      );

      await refreshProjects(workspace.id);

      setName("");
      setCategory("");
      setDescription("");
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {workspace.name} / Projects
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Projects Directory
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-2.5 py-1 text-xs text-muted">
              <span className="size-2 rounded-full bg-green" />
              <strong className="text-foreground">{activeProjects.length}</strong> Active
              <span className="text-outline">·</span>
              <strong className="text-foreground">{archivedCount}</strong> Archived
            </span>
          </div>
        </div>

        {canManage && (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong"
            onClick={() => {
              setCreating(true);
              setError("");
            }}
          >
            <Icon name="create_new_folder" />
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
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-surface-low p-2">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Search projects</span>
            <Icon name="search" size={17} className="absolute left-2.5 top-2.5 text-outline" />
            <input
              className={`${control} w-full bg-white pl-8`}
              placeholder="Filter projects by name, key, or category..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="sr-only" htmlFor="project-status-filter">Filter by status</label>
          <select
            id="project-status-filter"
            className={`${control} bg-white`}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {["All", "In Progress", "Planning", "In Review", "Completed", "Archived"].map((status) => (
              <option key={status} value={status}>{status === "All" ? "All statuses" : status}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="project-category-filter">Filter by category</label>
          <select
            id="project-category-filter"
            className={`${control} bg-white`}
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="All">All categories</option>
            {[...categories].sort().map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="sr-only" htmlFor="project-sort">Sort projects</label>
          <select
            id="project-sort"
            className={`${control} bg-white`}
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            {["Recent", "Name", "Progress"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <div role="group" aria-label="Project view" className="flex rounded-lg border border-border/50 bg-white p-0.5">
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={`${mode} view`}
                aria-pressed={view === mode}
                className={`grid size-8 place-items-center rounded-md ${view === mode ? "bg-accent text-white" : "text-muted hover:bg-surface-low"}`}
                onClick={() => setView(mode)}
              >
                <Icon name={mode === "grid" ? "grid_view" : "format_list_bulleted"} size={17} />
              </button>
            ))}
          </div>
        </div>

        {filtered.length ? (
          <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "flex flex-col gap-3"}>
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

                  {project.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">
                      {project.description}
                    </p>
                  )}

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
                setCategoryFilter("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </Panel>

      {creating && canManage && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
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
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setCreating(false);
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.querySelector("form")?.requestSubmit();
              }
            }}
            className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-border/40 bg-white p-5 sm:p-6">
              <div>
                <h2 id="new-project-title" className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                  <Icon name="create_new_folder" className="text-accent" />
                  Create New Project
                </h2>
                <p className="mt-1 text-sm text-muted">Set up a new project space for your team and workflows.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={busy}
                onClick={() => setCreating(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-low hover:text-foreground"
              >
                <Icon name="close" />
              </button>
            </div>

            <form
              id="create-project-form"
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) =>
                void createProject(event)
              }
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface-bright p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_170px]">
                  <label className="block text-sm font-medium">
                    Project name <span className="text-red">*</span>
                    <input
                      autoFocus
                      required
                      minLength={2}
                      className={`${control} mt-1.5 w-full bg-white`}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Design System v2.0"
                    />
                  </label>
                  <div className="block text-sm font-medium">
                    Project key
                    <div className="relative mt-1.5">
                      <input
                        readOnly
                        aria-label="Generated project key preview"
                        className={`${control} w-full bg-accent/10 pr-9 font-mono font-bold uppercase tracking-wider text-accent`}
                        value={projectKeyPreview(name)}
                      />
                      <Icon name="lock" size={16} className="absolute right-3 top-2.5 text-outline" />
                    </div>
                  </div>
                </div>

                <label className="block text-sm font-medium">
                  Description
                  <textarea
                    className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-border bg-white p-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What is this project working toward?"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Team / category
                  <input
                    type="text"
                    className={`${control} mt-1.5 w-full bg-white`}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="e.g. Product & Engineering"
                  />
                </label>

                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-white p-4 sm:px-6">
                <span className="hidden items-center gap-1.5 font-mono text-[10px] text-muted sm:flex">
                  <Icon name="keyboard" size={14} /> Press Ctrl/⌘ + Enter to confirm
                </span>
                <span className="flex-1 sm:hidden" />
                <div className="flex gap-2">
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
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong disabled:opacity-50"
                >
                  <Icon name="check" size={16} />
                  {busy
                    ? "Creating..."
                    : "Create Project"}
                </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
