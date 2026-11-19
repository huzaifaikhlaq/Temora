"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  sprintApi,
  type Sprint,
  type SprintIssue,
  type SprintMetrics,
} from "@/features/sprints/lib/api";

type Destination = {
  id: string;
  name: string;
  capacity_points: number;
};

type Preview = {
  sprint: Sprint;
  metrics?: SprintMetrics;
  open_issues?: SprintIssue[];
  destinations?: Destination[];
  pending?: boolean;
};

type Mode = "next" | "backlog" | "new";

const input =
  "w-full rounded-lg border border-border bg-white p-2 text-sm";

export function SprintCompletionPanel({
  sprintId,
}: {
  sprintId: string;
}) {
  const router = useRouter();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<Mode>("next");
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newCapacity, setNewCapacity] = useState(40);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await sprintApi<Preview>(
        `sprints/${sprintId}/complete`,
      );

      setPreview(result);

      if (result.open_issues) {
        setSelected(
          result.open_issues.map((issue) => issue.id),
        );
      }

      if (!result.destinations?.length) {
        setMode("backlog");
      } else {
        setTarget(result.destinations[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load",
      );
    }
  }, [sprintId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete() {
    setBusy(true);
    setError("");

    try {
      const payload =
        preview?.pending
          ? {}
          : {
            mode,
            target_sprint_id:
              mode === "next" ? target : undefined,
            selected_issue_ids: selected,
            ...(mode === "new"
              ? {
                new_name: newName,
                new_start_date: newStart,
                new_end_date: newEnd,
                new_capacity_points: newCapacity,
              }
              : {}),
          };

      await sprintApi(
        `sprints/${sprintId}/complete`,
        "POST",
        payload,
      );

      router.push(
        `/sprints/${sprintId}/retrospective`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Completion failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!preview) {
    return (
      <main className="p-8">
        {error || "Loading sprint..."}
      </main>
    );
  }

  const {
    sprint,
    metrics,
    open_issues = [],
    destinations = [],
  } = preview;

  if (sprint.status === "completed") {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">
          Sprint Completed
        </h1>
        <Link
          href={`/sprints/${sprintId}/retrospective`}
          className="mt-4 inline-block text-accent"
        >
          View Retrospective
        </Link>
      </main>
    );
  }

  const selectedIssues = open_issues.filter(
    (issue) => selected.includes(issue.id),
  );

  const rolloverPoints = selectedIssues.reduce(
    (sum, issue) => sum + (issue.story_points || 0),
    0,
  );

  const chosen = destinations.find(
    (item) => item.id === target,
  );

  return (
    <main className="mx-auto grid min-h-[80vh] max-w-4xl place-items-center p-4">
      <section className="w-full space-y-5 rounded-xl border border-border bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-accent">
              COMPLETE SPRINT
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Complete {sprint.name}
            </h1>

            <p className="text-sm text-muted">
              {sprint.start_date} — {sprint.end_date}
            </p>
          </div>

          <Link
            href={`/projects/${sprint.project_id}/sprints`}
            aria-label="Close"
          >
            ✕
          </Link>
        </div>

        {metrics && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-surface-low p-4">
              <p className="text-xs text-muted">
                Completed
              </p>
              <strong className="text-xl">
                {metrics.completed_issues} issues
              </strong>
              <p className="text-xs">
                {metrics.completed_points} points
              </p>
            </div>

            <div className="rounded-lg bg-surface-low p-4">
              <p className="text-xs text-muted">
                Incomplete
              </p>
              <strong className="text-xl">
                {metrics.open_issues} issues
              </strong>
              <p className="text-xs">
                {metrics.remaining_points} points
              </p>
            </div>

            <div className="rounded-lg bg-surface-low p-4">
              <p className="text-xs text-muted">
                Velocity
              </p>
              <strong className="text-xl">
                {metrics.velocity_percent}%
              </strong>
            </div>
          </div>
        )}

        {!preview.pending ? (
          <>
            <div>
              <h2 className="font-semibold">
                Destination for unfinished commitments
              </h2>

              <p className="mt-1 text-xs text-muted">
                Choose where selected issues should go.
                Unselected issues stay in sprint history.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block rounded-lg border p-3">
                <input
                  type="radio"
                  name="destination"
                  checked={mode === "next"}
                  onChange={() => setMode("next")}
                  disabled={!destinations.length}
                />
                <span className="ml-2 font-medium">
                  Move to Next Sprint
                </span>
              </label>

              {mode === "next" && (
                <select
                  className={input}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {destinations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}

              <label className="block rounded-lg border p-3">
                <input
                  type="radio"
                  name="destination"
                  checked={mode === "backlog"}
                  onChange={() => setMode("backlog")}
                />
                <span className="ml-2 font-medium">
                  Move to Product Backlog
                </span>
              </label>

              <label className="block rounded-lg border p-3">
                <input
                  type="radio"
                  name="destination"
                  checked={mode === "new"}
                  onChange={() => setMode("new")}
                />
                <span className="ml-2 font-medium">
                  Create New Future Sprint
                </span>
              </label>

              {mode === "new" && (
                <div className="grid gap-3 rounded-lg bg-surface-low p-4 sm:grid-cols-2">
                  <input
                    className={input}
                    placeholder="New sprint name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />

                  <input
                    className={input}
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) =>
                      setNewCapacity(Number(e.target.value))
                    }
                  />

                  <label className="text-xs">
                    Start Date
                    <input
                      type="date"
                      className={input}
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                    />
                  </label>

                  <label className="text-xs">
                    End Date
                    <input
                      type="date"
                      className={input}
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 font-semibold">
                Unfinished Issues Preview
              </h2>

              <div className="max-h-60 space-y-2 overflow-y-auto">
                {open_issues.map((issue) => (
                  <label
                    key={issue.id}
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(issue.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(issue.id)
                            ? current.filter((id) => id !== issue.id)
                            : [...current, issue.id],
                        )
                      }
                    />

                    <strong className="text-accent">
                      {issue.key}
                    </strong>

                    <span className="flex-1">
                      {issue.title}
                    </span>

                    <span className="text-muted">
                      {issue.story_points || 0} pts
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-surface-low p-4">
              <p className="font-semibold">
                Target Iteration Preview
              </p>

              <p className="mt-1 text-sm">
                {mode === "next"
                  ? chosen?.name || "Choose a sprint"
                  : mode === "backlog"
                    ? "Product Backlog"
                    : newName || "New Future Sprint"}
              </p>

              <p className="mt-1 text-sm">
                {selected.length} selected issues ·{" "}
                {rolloverPoints} story points
              </p>

              {mode !== "backlog" && (
                <p className="text-xs text-muted">
                  Target capacity:{" "}
                  {mode === "next"
                    ? chosen?.capacity_points
                    : newCapacity}{" "}
                  points
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-lg bg-surface-low p-4 text-sm">
            The completion operation is pending.
            Resume the same rollover operation to finish it safely.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Link
            href={`/projects/${sprint.project_id}/sprints`}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </Link>

          <button
            disabled={busy}
            onClick={complete}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Completing..."
              : preview.pending
                ? "Resume Completion"
                : "Complete Sprint & Rollover"}
          </button>
        </div>
      </section>
    </main>
  );
}