"use client";

import Link from "next/link";
import { useState } from "react";
import { demoRepository } from "@/features/workspace/data/demo-repository";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const select = "mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm";

export function SprintCompletionPanel({ sprintId }: { sprintId?: string } = {}) {
  const state = useDemoState();
  const sprint = state.sprints.find(
    (item) =>
      item.workspaceId === state.activeWorkspaceId &&
      (sprintId
        ? item.id === sprintId || item.id === `sprint-${sprintId}`
        : item.status === "Active"),
  );
  const [destination, setDestination] = useState("");
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const issues = sprint ? state.issues.filter((issue) => issue.sprintId === sprint.id) : [];
  const openIssues = issues.filter((issue) => issue.status !== "Done");
  const points = issues.reduce((sum, issue) => sum + issue.storyPoints, 0);
  const completePoints = issues
    .filter((issue) => issue.status === "Done")
    .reduce((sum, issue) => sum + issue.storyPoints, 0);
  const destinations = state.sprints.filter(
    (item) => item.projectId === sprint?.projectId && item.status === "Planned",
  );

  function finish() {
    if (!sprint) return;
    try {
      demoRepository.completeSprint(sprint.id, destination || null);
      setError("");
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete the sprint.");
    }
  }

  if (!sprint || completed)
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center p-6">
        <section className="w-full rounded-xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">
            {completed ? "Sprint completed" : "No active sprint"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {completed
              ? "Open issues were moved to your selected destination."
              : "Start a sprint from project planning before completing it."}
          </p>
          <Link
            className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            href={sprint ? `/projects/${sprint.projectId}/sprints` : "/projects"}
          >
            Continue
          </Link>
        </section>
      </main>
    );

  return (
    <main className="mx-auto grid min-h-[calc(100vh-7rem)] place-items-center p-4 sm:p-6">
      <section className="w-full max-w-2xl rounded-xl border border-border bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Active sprint · Complete sprint
            </p>
            <h1 className="mt-1 text-2xl font-bold">{sprint.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {state.projects.find((project) => project.id === sprint.projectId)?.name} · Ends{" "}
              {sprint.endDate}
            </p>
          </div>
          <Link
            href={`/projects/${sprint.projectId}/sprints`}
            aria-label="Close"
            className="text-muted"
          >
            ×
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [
              "Completed issues",
              `${issues.filter((issue) => issue.status === "Done").length} · ${completePoints} pts`,
            ],
            [
              "Incomplete / open",
              `${openIssues.length} · ${openIssues.reduce((sum, issue) => sum + issue.storyPoints, 0)} pts`,
            ],
            [
              "Velocity achievement",
              points ? `${Math.round((completePoints / points) * 100)}%` : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-low p-4">
              <span className="text-xs text-muted">{label}</span>
              <strong className="mt-2 block text-lg">{value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{openIssues.length} issues are incomplete</strong>
          <p className="mt-1">Select a destination for open work before closing this sprint.</p>
        </div>
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {openIssues.map((issue) => (
            <div
              key={issue.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <span className="font-mono text-xs font-semibold text-accent">{issue.key}</span>
              <span className="flex-1 text-sm">{issue.title}</span>
              <span className="text-xs text-muted">
                {issue.status} · {issue.storyPoints} pts
              </span>
            </div>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium">
          Move incomplete issues to
          <select
            className={select}
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            <option value="">Backlog</option>
            {destinations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Link
            href={`/projects/${sprint.projectId}/sprints`}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Complete sprint
          </button>
        </div>
        <p className="mt-3 text-right text-xs text-muted">
          Changes are saved to this browser’s demo workspace.
        </p>
      </section>
    </main>
  );
}
