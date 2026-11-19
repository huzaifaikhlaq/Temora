"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  sprintApi,
  type Sprint,
  type SprintMetrics,
  type RetroNote,
} from "@/features/sprints/lib/api";

type Category = RetroNote["category"];

type RetroData = {
  sprint: Sprint;
  notes: RetroNote[];
  attendance_count: number;
  average_sentiment: number | null;
  action_items: number;
  ai_themes: string[];
};

type MetricResponse = {
  metrics: SprintMetrics;
};

const columns: {
  id: Category;
  title: string;
  color: string;
}[] = [
    {
      id: "went_well",
      title: "What Went Well",
      color: "bg-emerald-50",
    },
    {
      id: "improve",
      title: "Could Improve",
      color: "bg-red-50",
    },
    {
      id: "ideas",
      title: "Ideas & Experiments",
      color: "bg-indigo-50",
    },
    {
      id: "action",
      title: "Action Items",
      color: "bg-violet-50",
    },
  ];

const input =
  "w-full rounded-lg border border-border bg-white p-2 text-sm";

export function RetrospectivePage({
  sprintId,
}: {
  sprintId: string;
}) {
  const [data, setData] = useState<RetroData | null>(null);
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [body, setBody] = useState("");

  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [sentiment, setSentiment] = useState(4);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [retro, stats] = await Promise.all([
        sprintApi<RetroData>(
          `sprints/${sprintId}/retrospective`,
        ),
        sprintApi<MetricResponse>(
          `sprints/${sprintId}/metrics`,
        ),
      ]);

      setData(retro);
      setMetrics(stats.metrics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load",
      );
    }
  }, [sprintId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");

    try {
      await action();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Request failed",
      );
    } finally {
      setBusy(false);
    }
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!category) return;

    const payload: Record<string, unknown> = {
      category,
      body,
    };

    if (category === "action") {
      payload.action_status = "assigned";

      if (assignee) payload.assignee_id = assignee;
      if (dueDate) payload.due_date = dueDate;
    }

    void run(async () => {
      await sprintApi(
        `sprints/${sprintId}/notes`,
        "POST",
        payload,
      );

      setCategory(null);
      setBody("");
      setAssignee("");
      setDueDate("");
    });
  }

  function addComment(note: RetroNote) {
    const comment = window.prompt(
      `Comment on: ${note.body}`,
    );

    if (!comment?.trim()) return;

    void run(() =>
      sprintApi(
        `sprints/${sprintId}/notes/${note.id}/comments`,
        "POST",
        { body: comment.trim() },
      ),
    );
  }

  if (!data) {
    return (
      <main className="p-8">
        {error || "Loading retrospective..."}
      </main>
    );
  }

  const sprint = data.sprint;

  const percentage = metrics
    ? metrics.velocity_percent
    : 0;

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">
            Sprint {sprint.number} · {sprint.status}
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            {sprint.name} — Retrospective & Insights
          </h1>

          <p className="mt-1 text-sm text-muted">
            {sprint.start_date} — {sprint.end_date}
          </p>

          <p className="mt-1 text-sm">
            {sprint.goal || "No sprint goal"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/sprint/sprints/${sprintId}/report?format=md`}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Export Markdown
          </a>

          <a
            href={`/api/sprint/sprints/${sprintId}/report?format=pdf`}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Export PDF
          </a>

          <button
            onClick={() => setCategory("action")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Create Action Item
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 p-3 text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Velocity Output"
          value={`${metrics?.completed_points ?? 0} / ${sprint.committed_points} pts`}
          detail={`${percentage}% of current scope completed`}
        />

        <Metric
          label="Sprint Carryover"
          value={`${metrics?.open_issues ?? 0} issues`}
          detail={`${metrics?.remaining_points ?? 0} unfinished points`}
        />

        <Metric
          label="Team Sentiment"
          value={
            data.average_sentiment === null
              ? "—"
              : `${data.average_sentiment} / 5`
          }
          detail="Average attendee rating"
        />

        <Metric
          label="Commitments"
          value={`${data.action_items}`}
          detail="Retrospective action items"
        />
      </div>

      {category && (
        <form
          onSubmit={submitNote}
          className="space-y-3 rounded-xl border bg-white p-5"
        >
          <h2 className="font-semibold">
            Add {columns.find((c) => c.id === category)?.title}
          </h2>

          <textarea
            required
            minLength={3}
            maxLength={2000}
            className={input}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Describe the feedback..."
          />

          {category === "action" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Assignee User ID (optional)
                <input
                  className={input}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Workspace member UUID"
                />
              </label>

              <label className="text-sm">
                Due Date
                <input
                  type="date"
                  className={input}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white"
            >
              Save Feedback
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const notes = data.notes.filter(
            (note) => note.category === column.id,
          );

          return (
            <section
              key={column.id}
              className={`rounded-xl p-4 ${column.color}`}
            >
              <header className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {column.title}
                </h2>

                <button
                  aria-label={`Add ${column.title}`}
                  onClick={() => setCategory(column.id)}
                  className="rounded-lg bg-white px-3 py-1 text-accent"
                >
                  +
                </button>
              </header>

              <div className="mt-4 space-y-3">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-lg border border-white bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm">
                      {note.body}
                    </p>

                    {column.id === "action" && (
                      <div className="mt-3 space-y-2 text-xs">
                        <p>
                          Assignee:{" "}
                          {note.assignee_id || "Unassigned"}
                        </p>

                        <p>
                          Due: {note.due_date || "Not set"}
                        </p>

                        <select
                          aria-label="Action status"
                          value={note.action_status}
                          disabled={busy}
                          onChange={(event) =>
                            void run(() =>
                              sprintApi(
                                `sprints/${sprintId}/notes/${note.id}`,
                                "PATCH",
                                {
                                  action_status: event.target.value,
                                },
                              ),
                            )
                          }
                          className={input}
                        >
                          <option value="assigned">
                            Assigned
                          </option>
                          <option value="in_progress">
                            In Progress
                          </option>
                          <option value="done">
                            Done
                          </option>
                        </select>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <button
                        disabled={busy}
                        aria-pressed={note.voted}
                        onClick={() =>
                          void run(() =>
                            sprintApi(
                              `sprints/${sprintId}/notes/${note.id}/vote`,
                              note.voted ? "DELETE" : "POST",
                              note.voted ? undefined : {},
                            ),
                          )
                        }
                        className="font-semibold text-accent"
                      >
                        ▲ {note.vote_count} Votes
                      </button>

                      <button
                        onClick={() => addComment(note)}
                        className="text-muted"
                      >
                        {note.comments.length} Comments
                      </button>
                    </div>

                    {note.comments.length > 0 && (
                      <div className="mt-3 space-y-1 border-t pt-2">
                        {note.comments.map((comment) => (
                          <p
                            key={comment.id}
                            className="text-xs text-muted"
                          >
                            {comment.body}
                          </p>
                        ))}
                      </div>
                    )}
                  </article>
                ))}

                {!notes.length && (
                  <p className="rounded-lg bg-white p-3 text-sm text-muted">
                    No feedback yet.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">
            AI Theme Extraction
          </h2>

          <p className="mt-2 text-sm text-muted">
            Summarize recurring patterns in team feedback.
          </p>

          <button
            disabled={busy}
            onClick={() =>
              void run(() =>
                sprintApi(
                  `sprints/${sprintId}/themes`,
                  "POST",
                  {},
                ),
              )
            }
            className="mt-3 rounded-lg border px-3 py-2 text-sm"
          >
            Generate Themes
          </button>

          <ul className="mt-4 space-y-2 text-sm">
            {data.ai_themes.map((theme, index) => (
              <li key={index} className="rounded-lg bg-surface-low p-2">
                {theme}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">
            Active Attendance
          </h2>

          <p className="mt-2 text-2xl font-bold">
            {data.attendance_count}
          </p>

          <p className="text-xs text-muted">
            Team members checked in
          </p>

          <label className="mt-4 block text-sm">
            Your team sentiment
            <select
              className={input}
              value={sentiment}
              onChange={(e) =>
                setSentiment(Number(e.target.value))
              }
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>

          <button
            disabled={busy}
            onClick={() =>
              void run(() =>
                sprintApi(
                  `sprints/${sprintId}/check-in`,
                  "POST",
                  {
                    attended: true,
                    sentiment,
                  },
                ),
              )
            }
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm text-white"
          >
            Submit Check-In
          </button>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">
            Burndown & Velocity
          </h2>

          <p className="mt-3 text-2xl font-bold">
            {metrics?.completed_points ?? 0} pts
          </p>

          <p className="text-sm text-muted">
            {metrics?.remaining_points ?? 0} remaining points
          </p>

          <Link
            href={`/reports/sprints/${sprintId}`}
            className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm text-white"
          >
            View Burndown Chart
          </Link>
        </section>
      </div>

      <Link
        href={`/projects/${sprint.project_id}/sprints`}
        className="inline-block text-sm text-accent"
      >
        Back to Sprint Planning
      </Link>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-semibold uppercase text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">
        {detail}
      </p>
    </div>
  );
}