"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  sprintApi,
  type Sprint,
  type SprintIssue,
} from "@/features/sprints/lib/api";

type Props = {
  workspaceId: string;
  projectId: string;
};

const input =
  "w-full rounded-lg border border-border bg-white p-2 text-sm";

export function SprintPlanning({
  workspaceId,
  projectId,
}: Props) {
  const base =
    `workspaces/${workspaceId}/projects/${projectId}`;

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<SprintIssue[]>([]);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState(40);

  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [sprintData, issueResponse] = await Promise.all([
        sprintApi<Sprint[]>(`${base}/sprints`),
        fetch(`/api/issue/${base}/issues`, {
          cache: "no-store",
        }),
      ]);

      if (!issueResponse.ok) {
        throw new Error("Could not load project issues.");
      }

      const issueData =
        (await issueResponse.json()) as SprintIssue[];

      setSprints(sprintData);
      setIssues(issueData);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load",
      );
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSprint(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      await sprintApi(`${base}/sprints`, "POST", {
        name,
        goal,
        start_date: startDate,
        end_date: endDate,
        capacity_points: capacity,
      });

      setCreating(false);
      setName("");
      setGoal("");

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Creation failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function startSprint(id: string) {
    setBusy(true);

    try {
      await sprintApi(`sprints/${id}/start`, "POST", {});
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Start failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function assignIssue(
    issueId: string,
    sprintId: string | null,
  ) {
    setBusy(true);

    try {
      const response = await fetch(
        `/api/issue/${base}/issues/${issueId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sprint_id: sprintId,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(JSON.stringify(payload));
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Assignment failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="p-8">Loading sprints...</main>;
  }

  const active = sprints.some(
    (s) => s.status === "active" ||
      s.status === "completing",
  );

  const backlog = issues.filter(
    (issue) => !issue.sprint_id,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Sprints & Backlog
          </h1>
          <p className="text-sm text-muted">
            Plan commitments, track work and deliver iterations.
          </p>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          + Create Sprint
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 p-3 text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {sprints.map((sprint) => {
          const assigned = issues.filter(
            (issue) => issue.sprint_id === sprint.id,
          );

          const total = assigned.reduce(
            (sum, issue) => sum + (issue.story_points || 0),
            0,
          );

          const done = assigned
            .filter((issue) => issue.status === "done")
            .reduce(
              (sum, issue) => sum + (issue.story_points || 0),
              0,
            );

          return (
            <section
              key={sprint.id}
              className="rounded-xl border border-border bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    {sprint.name}
                  </h2>

                  <p className="text-xs uppercase text-accent">
                    {sprint.status}
                  </p>

                  <p className="mt-1 text-sm text-muted">
                    {sprint.start_date} — {sprint.end_date}
                  </p>

                  <p className="mt-2 text-sm">
                    {sprint.goal || "No goal defined"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sprint.status === "planned" && (
                    <button
                      disabled={busy || active}
                      onClick={() => startSprint(sprint.id)}
                      className="rounded-lg bg-accent px-3 py-2 text-xs text-white disabled:opacity-50"
                    >
                      Start Sprint
                    </button>
                  )}

                  {sprint.status === "active" && (
                    <Link
                      href={`/sprints/${sprint.id}/complete`}
                      className="rounded-lg bg-accent px-3 py-2 text-xs text-white"
                    >
                      Complete Sprint
                    </Link>
                  )}

                  <Link
                    href={`/sprints/${sprint.id}/retrospective`}
                    className="rounded-lg border px-3 py-2 text-xs"
                  >
                    Retrospective
                  </Link>

                  <Link
                    href={`/reports/sprints/${sprint.id}`}
                    className="rounded-lg border px-3 py-2 text-xs"
                  >
                    Burndown
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-low p-3">
                  <p className="text-xs text-muted">Capacity</p>
                  <strong>{sprint.capacity_points} pts</strong>
                </div>

                <div className="rounded-lg bg-surface-low p-3">
                  <p className="text-xs text-muted">Committed</p>
                  <strong>
                    {sprint.status === "completed"
                      ? sprint.committed_points
                      : total} pts
                  </strong>
                </div>

                <div className="rounded-lg bg-surface-low p-3">
                  <p className="text-xs text-muted">Completed</p>
                  <strong>
                    {sprint.status === "completed"
                      ? sprint.completed_points
                      : done} pts
                  </strong>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {assigned.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
                  >
                    <strong className="text-accent">
                      {issue.key}
                    </strong>
                    <span className="flex-1">
                      {issue.title}
                    </span>
                    <span>{issue.status}</span>
                    <span>
                      {issue.story_points || 0} pts
                    </span>

                    {sprint.status !== "completed" &&
                      sprint.status !== "completing" && (
                        <button
                          disabled={busy}
                          onClick={() => assignIssue(issue.id, null)}
                          className="text-xs text-red-600"
                        >
                          Remove
                        </button>
                      )}
                  </div>
                ))}

                {!assigned.length && (
                  <p className="text-sm text-muted">
                    No assigned issues.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">
          Product Backlog
        </h2>

        <div className="mt-4 space-y-2">
          {backlog.map((issue) => (
            <div
              key={issue.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
            >
              <strong className="text-accent">
                {issue.key}
              </strong>

              <span className="flex-1">
                {issue.title}
              </span>

              <select
                aria-label={`Assign ${issue.key} to sprint`}
                disabled={busy}
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    void assignIssue(
                      issue.id,
                      event.target.value,
                    );
                  }
                }}
                className={input}
              >
                <option value="">
                  Add to Sprint...
                </option>

                {sprints
                  .filter(
                    (sprint) =>
                      sprint.status === "planned" ||
                      sprint.status === "active",
                  )
                  .map((sprint) => (
                    <option
                      key={sprint.id}
                      value={sprint.id}
                    >
                      {sprint.name}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={createSprint}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6"
          >
            <h2 className="text-xl font-bold">
              Create New Sprint
            </h2>

            <label className="block text-sm">
              Name
              <input
                required
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="block text-sm">
              Sprint Goal
              <textarea
                className={input}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Start Date
                <input
                  required
                  type="date"
                  className={input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>

              <label className="text-sm">
                End Date
                <input
                  required
                  type="date"
                  className={input}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm">
              Capacity Points
              <input
                type="number"
                min="1"
                className={input}
                value={capacity}
                onChange={(e) =>
                  setCapacity(Number(e.target.value))
                }
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg border px-4 py-2"
              >
                Cancel
              </button>

              <button
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50"
              >
                Create Sprint
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}