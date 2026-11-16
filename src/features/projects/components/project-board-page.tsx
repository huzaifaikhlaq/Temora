"use client";

import Link from "next/link";
import { useEffect, useState, type DragEvent } from "react";

import { workspaceApi } from "@/features/workspace/api/client";
import { projectApi, type Project } from "@/features/projects/api/client";
import {
  issueApi,
  type Issue,
  type IssuePriority,
  type IssueStatus,
} from "@/features/issues/api/client";
import { Icon } from "@/components/shared/icon";

const columns: {
  id: IssueStatus;
  label: string;
}[] = [
  { id: "backlog", label: "Backlog" },
  { id: "to_do", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

export function ProjectBoardPage({ projectId }: { projectId: string }) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | IssuePriority>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"priority" | "due_date" | "updated_at">("priority");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const { workspace_id } = await workspaceApi.selected();

        if (!workspace_id) {
          throw new Error("Select a workspace first");
        }

        const [projectResult, issueResults] = await Promise.all([
          projectApi.get(workspace_id, projectId),
          issueApi.list(workspace_id, projectId),
        ]);

        if (!mounted) return;

        setWorkspaceId(workspace_id);
        setProject(projectResult);
        setIssues(issueResults.filter((issue) => !issue.is_draft && !issue.archived_at));
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : "Unable to load board");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function move(status: IssueStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();

    const issue = issues.find((item) => item.id === dragId);

    if (!issue || issue.status === status || updating) {
      setDragId(null);
      return;
    }

    setUpdating(true);
    setError("");

    setIssues((items) => items.map((item) => (item.id === issue.id ? { ...item, status } : item)));

    try {
      const updated = await issueApi.update(workspaceId, projectId, issue.id, { status });

      setIssues((items) => items.map((item) => (item.id === issue.id ? updated : item)));
    } catch (cause) {
      setIssues((items) => items.map((item) => (item.id === issue.id ? issue : item)));

      setError(cause instanceof Error ? cause.message : "Could not move issue");
    } finally {
      setUpdating(false);
      setDragId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-surface-low p-6">
        <div className="mx-auto max-w-[1800px] animate-pulse space-y-5">
          <div className="h-24 rounded-xl bg-white" />
          <div className="h-11 rounded-lg bg-white" />
          <div className="flex gap-4 overflow-hidden">
            {columns.map((column) => (
              <div
                key={column.id}
                className="h-[520px] w-[300px] shrink-0 rounded-xl bg-surface-container"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <p role="alert" className="p-8 text-sm text-red">
        {error}
      </p>
    );
  }

  const assignees = Array.from(
    new Set(issues.map((issue) => issue.assignee_id).filter((id): id is string => Boolean(id))),
  );
  const labels = Array.from(new Set(issues.flatMap((issue) => issue.tags)));
  const priorityOrder: Record<IssuePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const filteredIssues = issues
    .filter((issue) => {
      const search = query.trim().toLowerCase();
      const matchesSearch =
        !search ||
        [issue.key, issue.title, issue.description, ...issue.tags, ...issue.components].some(
          (value) => value.toLowerCase().includes(search),
        );
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === "all" || issue.assignee_id === assigneeFilter;
      const matchesLabel = labelFilter === "all" || issue.tags.includes(labelFilter);
      return matchesSearch && matchesPriority && matchesAssignee && matchesLabel;
    })
    .sort((first, second) => {
      if (sortBy === "due_date")
        return (first.due_date ?? "9999-12-31").localeCompare(second.due_date ?? "9999-12-31");
      if (sortBy === "updated_at") return second.updated_at.localeCompare(first.updated_at);
      return priorityOrder[first.priority] - priorityOrder[second.priority];
    });

  const statusColors: Record<IssueStatus, string> = {
    backlog: "bg-outline",
    to_do: "bg-accent",
    in_progress: "bg-accent",
    in_review: "bg-secondary",
    done: "bg-green",
  };
  const priorityStyle: Record<IssuePriority, { icon: string; className: string }> = {
    urgent: { icon: "keyboard_double_arrow_up", className: "bg-red/10 text-red" },
    high: { icon: "arrow_upward", className: "text-accent" },
    medium: { icon: "drag_handle", className: "text-muted" },
    low: { icon: "arrow_downward", className: "text-outline" },
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-low">
      <section className="border-b border-border/40 bg-white px-4 pb-0 pt-5 shadow-sm sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 pb-4 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <Icon name="web" size={23} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[Geist] text-2xl font-semibold tracking-tight">
                  {project?.name ?? "Project"}
                </h1>
                {project?.key && (
                  <span className="rounded bg-surface-high px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-muted">
                    {project.key}
                  </span>
                )}
                {project && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2 py-1 text-[11px] font-medium capitalize text-green">
                    <span className="size-1.5 rounded-full bg-green" />
                    {project.status.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted">
                {project?.description || "Plan, prioritize, and track work across your project."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {assignees.length > 0 && (
              <div className="mr-1 flex items-center -space-x-1.5">
                {assignees.slice(0, 4).map((assignee, index) => (
                  <span
                    key={assignee}
                    title={`Assignee ${assignee}`}
                    className={`flex size-7 items-center justify-center rounded-full border-2 border-white font-mono text-[9px] font-bold text-white ${["bg-accent", "bg-secondary", "bg-green", "bg-outline"][index % 4]}`}
                  >
                    {assignee.slice(0, 2).toUpperCase()}
                  </span>
                ))}
                {assignees.length > 4 && (
                  <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-surface-high font-mono text-[9px] text-muted">
                    +{assignees.length - 4}
                  </span>
                )}
              </div>
            )}
            <Link
              href={`/work-items/new?projectId=${projectId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-strong"
            >
              <Icon name="add" size={17} />
              Create Work Item
            </Link>
          </div>
        </div>
        <nav aria-label="Project views" className="flex items-center gap-2 overflow-x-auto">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-xs text-muted transition hover:text-foreground"
          >
            <Icon name="dashboard" size={16} />
            Overview
          </Link>
          <Link
            href={`/projects/${projectId}/board`}
            aria-current="page"
            className="relative inline-flex shrink-0 items-center gap-1.5 border-b-2 border-accent px-2 py-2.5 text-xs font-semibold text-accent"
          >
            <Icon name="view_kanban" size={16} />
            Board
          </Link>
          <Link
            href={`/projects/${projectId}/sprints`}
            className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-xs text-muted transition hover:text-foreground"
          >
            <Icon name="cycle" size={16} />
            Sprints
          </Link>
          <Link
            href={`/work-items?projectId=${projectId}`}
            className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-xs text-muted transition hover:text-foreground"
          >
            <Icon name="table_rows" size={16} />
            List
          </Link>
          <Link
            href="/calendar"
            className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-xs text-muted transition hover:text-foreground"
          >
            <Icon name="calendar_month" size={16} />
            Calendar
          </Link>
          <Link
            href={`/projects/${projectId}/settings`}
            className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-xs text-muted transition hover:text-foreground"
          >
            <Icon name="settings" size={16} />
            Settings
          </Link>
        </nav>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
          <label className="relative block w-full max-w-xs">
            <Icon
              name="filter_alt"
              size={16}
              className="pointer-events-none absolute left-2.5 top-2 text-outline"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 w-full rounded-lg bg-white pl-8 pr-3 text-xs shadow-sm outline-none placeholder:text-outline focus:ring-1 focus:ring-accent"
              placeholder="Filter issues..."
              aria-label="Filter issues"
            />
          </label>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white p-0.5 shadow-sm">
            <label className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted">
              Assignee:
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className="max-w-28 bg-transparent font-medium text-foreground outline-none"
              >
                <option value="all">All</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted">
              Priority:
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as "all" | IssuePriority)}
                className="bg-transparent font-medium text-foreground outline-none"
              >
                <option value="all">All</option>
                {(["urgent", "high", "medium", "low"] as IssuePriority[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority[0].toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted">
              Label:
              <select
                value={labelFilter}
                onChange={(event) => setLabelFilter(event.target.value)}
                className="max-w-28 bg-transparent font-medium text-foreground outline-none"
              >
                <option value="all">All</option>
                {labels.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-8 items-center gap-1 rounded-lg bg-white px-2 text-[10px] text-muted shadow-sm">
            SORT:
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="bg-transparent text-xs font-medium text-foreground outline-none"
            >
              <option value="priority">Priority</option>
              <option value="due_date">Due date</option>
              <option value="updated_at">Updated</option>
            </select>
          </label>
          <div className="flex h-8 items-center rounded-lg bg-white p-0.5 shadow-sm">
            <button
              type="button"
              title="Board view"
              aria-pressed="true"
              className="flex h-7 items-center rounded-md bg-accent/10 px-2.5 text-accent"
            >
              <Icon name="view_kanban" size={16} />
            </button>
            <Link
              href={`/work-items?projectId=${projectId}`}
              title="List view"
              className="flex h-7 items-center rounded-md px-2.5 text-muted transition hover:bg-surface-low"
            >
              <Icon name="view_list" size={16} />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mx-4 mb-2 rounded-lg bg-red/10 px-3 py-2 text-xs text-red sm:mx-6 lg:mx-8"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex min-w-max items-start gap-4 pb-2">
          {columns.map((column) => {
            const cards = filteredIssues.filter((issue) => issue.status === column.id);
            const activeColumn = column.id === "in_progress";
            return (
              <section
                key={column.id}
                aria-label={`${column.label}, ${cards.length} issues`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void move(column.id, event)}
                className={`flex w-[300px] shrink-0 flex-col rounded-xl p-2 ${activeColumn ? "bg-surface-container shadow-md" : "bg-surface-container shadow-sm"}`}
              >
                <div className="mb-2 flex items-center justify-between px-1.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`relative size-2.5 rounded-full ${statusColors[column.id]}`}>
                      {activeColumn && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-40" />
                      )}
                    </span>
                    <h2
                      className={`text-[11px] font-bold uppercase tracking-wider ${activeColumn ? "text-accent" : "text-foreground"}`}
                    >
                      {column.label}
                    </h2>
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${activeColumn ? "bg-accent text-white" : "bg-surface-high text-muted"}`}
                    >
                      {cards.length}
                    </span>
                  </div>
                  <Link
                    href={`/work-items/new?projectId=${projectId}`}
                    aria-label={`Add issue to ${column.label}`}
                    className="flex size-6 items-center justify-center rounded text-outline transition hover:bg-surface-high hover:text-foreground"
                  >
                    <Icon name="add" size={16} />
                  </Link>
                </div>
                <div className="flex flex-col gap-2">
                  {cards.map((issue) => {
                    const priority = priorityStyle[issue.priority];
                    const dueDate = issue.due_date
                      ? new Date(`${issue.due_date}T12:00:00`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "2-digit",
                        })
                      : null;
                    const overdue = Boolean(
                      issue.due_date &&
                      issue.due_date < new Date().toISOString().slice(0, 10) &&
                      issue.status !== "done",
                    );
                    return (
                      <article
                        key={issue.id}
                        draggable={!updating}
                        onDragStart={() => setDragId(issue.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`group rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md ${issue.priority === "urgent" ? "shadow-md" : ""} ${dragId === issue.id ? "cursor-grabbing opacity-50" : "cursor-grab"}`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <Link
                            href={`/projects/${projectId}/issues/${issue.id}`}
                            className="font-mono text-[10px] font-semibold text-accent hover:underline"
                          >
                            {issue.key}
                          </Link>
                          <div className="flex min-w-0 items-center gap-1.5">
                            {issue.components.slice(0, 1).map((component) => (
                              <span
                                key={component}
                                className="max-w-24 truncate rounded bg-surface-high px-1.5 py-0.5 font-mono text-[9px] text-muted"
                              >
                                {component}
                              </span>
                            ))}
                            {issue.assignee_id && (
                              <span
                                title={`Assignee ${issue.assignee_id}`}
                                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-white"
                              >
                                {issue.assignee_id.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/projects/${projectId}/issues/${issue.id}`}
                          className="mb-2 block text-[13px] font-medium leading-snug text-foreground hover:text-accent"
                        >
                          {issue.title}
                        </Link>
                        {issue.subtasks.length > 0 && (
                          <div className="mb-2">
                            <div className="mb-1 flex items-center justify-between font-mono text-[9px] text-muted">
                              <span className="flex items-center gap-1">
                                <Icon name="check_circle" size={13} className="text-green" />
                                Child issues
                              </span>
                              <span className="font-medium text-foreground">
                                {issue.subtasks_completed}/{issue.subtasks.length}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-surface-high">
                              <div
                                className="h-full rounded-full bg-green"
                                style={{
                                  width: `${(issue.subtasks_completed / issue.subtasks.length) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-1 font-mono text-[9px]">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold capitalize ${issue.priority === "urgent" ? "bg-red/10 text-red" : priority.className}`}
                          >
                            <Icon name={priority.icon} size={13} />
                            {issue.priority}
                          </span>
                          <div className="flex min-w-0 items-center gap-2 text-outline">
                            {issue.attachments.length > 0 && (
                              <span
                                className="flex items-center gap-0.5"
                                title={`${issue.attachments.length} attachments`}
                              >
                                <Icon name="attach_file" size={13} />
                                {issue.attachments.length}
                              </span>
                            )}
                            {issue.story_points !== null && <span>{issue.story_points} pts</span>}
                            {dueDate && (
                              <span
                                className={`flex items-center gap-0.5 whitespace-nowrap ${overdue ? "font-semibold text-red" : ""}`}
                              >
                                <Icon name={overdue ? "alarm" : "calendar_today"} size={13} />
                                {overdue ? "Overdue" : dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-outline/30 px-3 py-5 text-center text-[11px] text-outline">
                      {filteredIssues.length ? "No issues match these filters" : "Drop issues here"}
                    </p>
                  )}
                </div>
                <Link
                  href={`/work-items/new?projectId=${projectId}`}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] text-outline transition hover:bg-surface-high hover:text-foreground"
                >
                  <Icon name="add" size={16} />
                  Add Issue
                </Link>
              </section>
            );
          })}
        </div>
      </div>
      <p className="px-4 pb-4 text-[11px] text-muted sm:px-6 lg:px-8">
        {filteredIssues.length} of {issues.length} issues Â· Drag a card to update its status
      </p>
    </div>
  );
}
