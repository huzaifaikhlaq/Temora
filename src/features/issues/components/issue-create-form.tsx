"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const input =
  "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const primary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong";

export function IssueCreateForm() {
  const state = useDemoState();
  const search = useSearchParams();
  const router = useRouter();
  const projects = state.projects.filter(
    (project) => project.workspaceId === state.activeWorkspaceId && !project.archivedAt,
  );
  const [projectId, setProjectId] = useState(search.get("projectId") ?? projects[0]?.id ?? "");
  const project = projects.find((item) => item.id === projectId);
  const sprintOptions = state.sprints.filter(
    (sprint) => sprint.projectId === projectId && sprint.status !== "Closed",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Urgent" | "High" | "Medium" | "Low">("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [storyPoints, setStoryPoints] = useState(3);
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function createIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const issue = demoRepository.createIssue({
        projectId,
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
        sprintId: sprintId || null,
        storyPoints,
        dueDate: dueDate || null,
        subtasks: subtasks.filter((item) => item.trim()),
      });
      window.localStorage.removeItem("temora-issue-draft-v1");
      router.push(`/issues/${issue.key}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the issue.");
    }
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(
        "temora-issue-draft-v1",
        JSON.stringify({
          projectId,
          title,
          description,
          priority,
          assigneeId,
          sprintId,
          storyPoints,
          dueDate,
          subtasks,
        }),
      );
      setNotice("Draft saved in this browser.");
      setError("");
    } catch {
      setError("Draft could not be saved in browser storage.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {state.workspaces.find((item) => item.id === state.activeWorkspaceId)?.name} / Issues
          </p>
          <h1 className="mt-1 text-2xl font-bold">Create issue</h1>
          <p className="mt-1 text-sm text-muted">
            Add a clear, actionable issue to a project in this workspace.
          </p>
        </div>
        <Link href="/issues" className="rounded-lg border border-border px-3 py-2 text-sm">
          Cancel
        </Link>
      </header>
      <form onSubmit={createIssue} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
          <label className="block text-sm font-semibold">
            Summary *
            <input
              className={`${input} mt-1`}
              required
              minLength={3}
              maxLength={255}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
            />
          </label>
          <label className="mt-5 block text-sm font-semibold">
            Description
            <textarea
              className="mt-1 min-h-36 w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-accent"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, scope, and expected outcome…"
            />
          </label>
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Subtasks</h2>
              <button
                type="button"
                className="text-sm font-medium text-accent"
                onClick={() => setSubtasks((items) => [...items, ""])}
              >
                + Add subtask
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {subtasks.map((item, index) => (
                <div className="flex gap-2" key={index}>
                  <input
                    aria-label={`Subtask ${index + 1}`}
                    className={input}
                    value={item}
                    onChange={(event) =>
                      setSubtasks((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    placeholder="Describe a subtask"
                  />
                  <button
                    type="button"
                    aria-label={`Remove subtask ${index + 1}`}
                    className="rounded-lg border border-border px-3 text-sm"
                    onClick={() =>
                      setSubtasks((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Save draft
            </button>
            <button className={primary}>Create issue</button>
          </div>
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
        <aside className="h-fit space-y-4 rounded-xl border border-border bg-white p-5">
          <label className="block text-xs font-semibold text-muted">
            Project
            <select
              className={`${input} mt-1`}
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setSprintId("");
              }}
              required
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.key})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Assignee
            <select
              className={`${input} mt-1`}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {state.members
                .filter((member) => member.workspaceId === state.activeWorkspaceId)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Priority
            <select
              className={`${input} mt-1`}
              value={priority}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
            >
              {["Urgent", "High", "Medium", "Low"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Sprint
            <select
              className={`${input} mt-1`}
              value={sprintId}
              onChange={(event) => setSprintId(event.target.value)}
            >
              <option value="">Backlog</option>
              {sprintOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Story points
            <input
              className={`${input} mt-1`}
              type="number"
              min="0"
              max="100"
              value={storyPoints}
              onChange={(event) => setStoryPoints(Number(event.target.value))}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Due date
            <input
              className={`${input} mt-1`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          {project && (
            <p className="text-xs leading-5 text-muted">
              This issue will be added to {project.name} ({project.key}).
            </p>
          )}
          <p className="text-xs leading-5 text-muted">
            This frontend preview saves issue data in this browser only. It does not send email or
            contact a service.
          </p>
        </aside>
      </form>
    </main>
  );
}
