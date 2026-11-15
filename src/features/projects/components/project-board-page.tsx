
"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type DragEvent,
} from "react";

import { workspaceApi } from "@/features/workspace/api/client";
import {
  projectApi,
  type Project,
} from "@/features/projects/api/client";
import {
  issueApi,
  type Issue,
  type IssueStatus,
} from "@/features/issues/api/client";

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

export function ProjectBoardPage({
  projectId,
}: {
  projectId: string;
}) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const { workspace_id } =
          await workspaceApi.selected();

        if (!workspace_id) {
          throw new Error("Select a workspace first");
        }

        const [projectResult, issueResults] =
          await Promise.all([
            projectApi.get(workspace_id, projectId),
            issueApi.list(workspace_id, projectId),
          ]);

        if (!mounted) return;

        setWorkspaceId(workspace_id);
        setProject(projectResult);
        setIssues(issueResults);
      } catch (cause) {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load board",
          );
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

  async function move(
    status: IssueStatus,
    event: DragEvent<HTMLElement>,
  ) {
    event.preventDefault();

    const issue = issues.find(
      (item) => item.id === dragId,
    );

    if (!issue || issue.status === status || updating) {
      setDragId(null);
      return;
    }

    setUpdating(true);
    setError("");

    setIssues((items) =>
      items.map((item) =>
        item.id === issue.id
          ? { ...item, status }
          : item,
      ),
    );

    try {
      const updated = await issueApi.update(
        workspaceId,
        projectId,
        issue.id,
        { status },
      );

      setIssues((items) =>
        items.map((item) =>
          item.id === issue.id ? updated : item,
        ),
      );
    } catch (cause) {
      setIssues((items) =>
        items.map((item) =>
          item.id === issue.id ? issue : item,
        ),
      );

      setError(
        cause instanceof Error
          ? cause.message
          : "Could not move issue",
      );
    } finally {
      setUpdating(false);
      setDragId(null);
    }
  }

  if (loading) {
    return <div className="p-8">Loading board...</div>;
  }

  if (error && !project) {
    return (
      <p role="alert" className="p-8 text-red-600">
        {error}
      </p>
    );
  }

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/projects"
            className="text-xs text-indigo-600"
          >
            Projects
          </Link>

          <h1 className="mt-1 text-2xl font-bold">
            {project?.name ?? "Project"} · Board
          </h1>

          <p className="text-sm text-slate-500">
            {issues.length} issues · Drag a card to update its status
          </p>
        </div>

        <Link
          href={`/tasks/new?projectId=${projectId}`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Create Issue
        </Link>
      </header>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex min-h-[530px] gap-3 overflow-x-auto pb-5">
        {columns.map((column) => {
          const cards = issues.filter(
            (issue) => issue.status === column.id,
          );

          return (
            <section
              key={column.id}
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={(event) =>
                void move(column.id, event)
              }
              className="w-72 shrink-0 rounded-xl bg-slate-100 p-3"
            >
              <h2 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-600">
                {column.label}
                <span className="rounded-full bg-white px-2 py-1">
                  {cards.length}
                </span>
              </h2>

              <div className="space-y-3">
                {cards.map((issue) => (
                  <article
                    key={issue.id}
                    draggable={!updating}
                    onDragStart={() =>
                      setDragId(issue.id)
                    }
                    onDragEnd={() =>
                      setDragId(null)
                    }
                    className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <p className="text-[11px] font-semibold text-indigo-600">
                      {issue.key} · {issue.issue_type}
                    </p>

                    <h3 className="mt-1 text-sm font-semibold">
                      {issue.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded bg-slate-100 px-2 py-1">
                        {issue.priority}
                      </span>

                      {issue.story_points && (
                        <span className="rounded bg-indigo-50 px-2 py-1">
                          {issue.story_points} pts
                        </span>
                      )}

                      {issue.subtasks.length > 0 && (
                        <span>
                          {issue.subtasks_completed}/
                          {issue.subtasks.length} subtasks
                        </span>
                      )}

                      {issue.assignee_id && (
                        <span>Assigned</span>
                      )}
                    </div>
                  </article>
                ))}

                {!cards.length && (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    Drop issues here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
