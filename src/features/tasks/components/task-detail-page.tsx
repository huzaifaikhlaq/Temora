"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const field = "rounded-lg border border-border bg-white px-3 py-2 text-sm";

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const state = useDemoState();
  const router = useRouter();
  const task = state.tasks.find(
    (item) =>
      (item.id === taskId || item.key === taskId) && item.workspaceId === state.activeWorkspaceId,
  );
  const [title, setTitle] = useState(task?.title ?? "");
  const [comment, setComment] = useState("");
  const [labels, setLabels] = useState(task?.labels.join(", ") ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!task)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-semibold">Task not found</h1>
        <p className="mt-2 text-sm text-muted">
          This task is not available in the active workspace.
        </p>
        <Link href="/tasks" className="mt-4 inline-block text-accent">
          Back to all tasks →
        </Link>
      </main>
    );
  const activeTask = task;
  const project = state.projects.find((item) => item.id === task.projectId);
  const parentTask = task.parentTaskId
    ? state.tasks.find((item) => item.id === task.parentTaskId)
    : undefined;
  const subtasks = state.tasks.filter((item) => item.parentTaskId === task.id);
  const comments = state.comments.filter((item) => item.taskId === task.id);

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      demoRepository.addComment(activeTask.id, comment);
      setComment("");
      setError("");
      setNotice("Comment added to this browser's demo workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add comment.");
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href={`/projects/${task.projectId}`} className="hover:text-accent">
          {project?.name ?? "Project"}
        </Link>
        <span>/</span>
        {parentTask && (
          <>
            <Link href={`/tasks/${parentTask.key}`} className="hover:text-accent">
              {parentTask.key}
            </Link>
            <span>/</span>
          </>
        )}
        <span>{task.key}</span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-accent/10 px-2 py-1 font-mono text-xs font-semibold text-accent">
                {task.key}
              </span>
              {parentTask && (
                <span className="rounded bg-surface-low px-2 py-1 text-[10px] font-medium text-muted">
                  Subtask
                </span>
              )}
              <span className="text-xs text-muted">{project?.name}</span>
              <Link className="ml-auto text-sm text-accent" href={`/tasks/${task.id}/dependencies`}>
                Dependencies &amp; activity →
              </Link>
              <button
                type="button"
                className="text-xs text-red-700"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${task.key}? This only removes it from this browser’s demo data.`,
                    )
                  ) {
                    demoRepository.deleteTask(task.id);
                    router.replace("/tasks");
                  }
                }}
              >
                Delete task
              </button>
            </div>
            <input
              aria-label="Task title"
              className="mt-4 w-full border-0 bg-transparent p-0 text-2xl font-bold outline-none"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                try {
                  demoRepository.updateTask(task.id, { title });
                  setError("");
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Invalid title.");
                }
              }}
            />
            <textarea
              aria-label="Description"
              className="mt-4 min-h-40 w-full rounded-lg border border-border p-3 text-sm leading-6 outline-none focus:border-accent"
              value={task.description}
              onChange={(event) =>
                demoRepository.updateTask(task.id, { description: event.target.value })
              }
            />
            <div className="mt-5">
              <h2 className="font-semibold">Subtasks</h2>
              <div className="mt-2 space-y-2">
                {subtasks.map((item) => (
                  <Link
                    key={item.id}
                    href={`/tasks/${item.key}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-low"
                  >
                    <span className="min-w-0">
                      <span className="mr-2 font-mono text-xs text-accent">{item.key}</span>
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{item.status}</span>
                  </Link>
                ))}
              </div>
              {!task.parentTaskId && <AddSubtask taskId={task.id} />}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-white p-5">
            <h2 className="font-semibold">Activity &amp; comments</h2>
            <form onSubmit={addComment} className="mt-3 flex gap-2">
              <input
                className={`${field} min-w-0 flex-1`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Write a comment…"
              />
              <button className="rounded-lg bg-accent px-3 text-sm font-semibold text-white">
                Comment
              </button>
            </form>
            {comments.map((item) => (
              <article key={item.id} className="mt-4 rounded-lg bg-surface-low p-3 text-sm">
                <p>{item.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {state.members.find((person) => person.id === item.authorId)?.name ??
                    "Workspace member"}{" "}
                  · {item.createdAt}
                </p>
              </article>
            ))}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="mt-3 text-sm text-emerald-700">
                {notice}
              </p>
            )}
          </section>
        </div>
        <aside className="h-fit space-y-3 rounded-xl border border-border bg-white p-4">
          <label className="block text-xs font-medium text-muted">
            Status
            <select
              className={`${field} mt-1 w-full`}
              value={task.status}
              onChange={(event) =>
                demoRepository.updateTask(task.id, {
                  status: event.target.value as typeof task.status,
                })
              }
            >
              {["Backlog", "To Do", "In Progress", "In Review", "Done"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted">
            Labels
            <input
              className={`${field} mt-1 w-full`}
              value={labels}
              onChange={(event) => {
                setLabels(event.target.value);
                demoRepository.updateTask(task.id, {
                  labels: event.target.value
                    .split(",")
                    .map((label) => label.trim())
                    .filter(Boolean),
                });
              }}
              placeholder="design, mobile"
            />
          </label>
          <label className="block text-xs font-medium text-muted">
            Priority
            <select
              className={`${field} mt-1 w-full`}
              value={task.priority}
              onChange={(event) =>
                demoRepository.updateTask(task.id, {
                  priority: event.target.value as typeof task.priority,
                })
              }
            >
              {["Urgent", "High", "Medium", "Low"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted">
            Assignee
            <select
              className={`${field} mt-1 w-full`}
              value={task.assigneeId ?? ""}
              onChange={(event) =>
                demoRepository.updateTask(task.id, { assigneeId: event.target.value || null })
              }
            >
              <option value="">Unassigned</option>
              {state.members
                .filter((person) => person.workspaceId === task.workspaceId)
                .map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-xs text-muted">
            Changes are stored in this browser’s local demo workspace.
          </p>
        </aside>
      </div>
    </main>
  );
}

function AddSubtask({ taskId }: { taskId: string }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          demoRepository.addSubtask(taskId, title);
          setTitle("");
          setError("");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not add subtask.");
        }
      }}
    >
      <input
        className={`${field} min-w-0 flex-1`}
        aria-label="Subtask title"
        minLength={3}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a subtask"
      />
      <button className="rounded-lg border border-border px-3 text-sm">Add</button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </form>
  );
}
