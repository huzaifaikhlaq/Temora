"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Icon } from "@/components/shared/icon";
import {
  sprintApi,
  type Sprint,
  type SprintMetrics,
  type RetroNote,
} from "@/features/sprints/lib/api";
import { workspaceApi } from "@/features/workspace/api/client";
import { workspaceMemberLabel } from "@/features/workspace/member-label";
import type { WorkspaceMember } from "@/features/workspace/types";

type Category = RetroNote["category"];

type RetroData = {
  sprint: Sprint;
  can_manage: boolean;
  notes: RetroNote[];
  attendance_count: number;
  average_sentiment: number | null;
  action_items: number;
  ai_themes: string[];
};

type MetricResponse = {
  metrics: SprintMetrics;
};

type BurndownSnapshot = {
  date: string;
  total_points: number;
  completed_points: number;
  remaining_points: number;
  total_issues: number;
  completed_issues: number;
};

type BurndownData = {
  sprint: Sprint;
  snapshots: BurndownSnapshot[];
};

const columns: {
  id: Category;
  title: string;
  dot: string;
  badge: string;
}[] = [
  {
    id: "went_well",
    title: "What Went Well",
    dot: "bg-emerald-700",
    badge: "bg-emerald-50 text-emerald-800",
  },
  {
    id: "improve",
    title: "Could Improve",
    dot: "bg-red-700",
    badge: "bg-red-50 text-red-800",
  },
  {
    id: "ideas",
    title: "Ideas & Experiments",
    dot: "bg-indigo-600",
    badge: "bg-indigo-50 text-indigo-800",
  },
  {
    id: "action",
    title: "Action Items",
    dot: "bg-violet-600",
    badge: "bg-violet-50 text-violet-800",
  },
];

const fieldClass =
  "w-full rounded-xl border border-border/60 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-outline focus:border-accent focus:ring-2 focus:ring-accent/20";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const phaseLabels: Record<Sprint["retrospective_phase"], string> = {
  collecting: "Collecting feedback",
  voting: "Voting open",
  closed: "Voting closed",
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value.includes("T") ? value : value + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusLabel(status: RetroNote["action_status"]) {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  return "Assigned";
}

function statusBadgeClass(status: RetroNote["action_status"]) {
  if (status === "in_progress") return "bg-indigo-100 text-indigo-900";
  if (status === "done") return "bg-emerald-100 text-emerald-900";
  return "bg-emerald-100 text-emerald-900";
}

export function RetrospectivePage({ sprintId }: { sprintId: string }) {
  const [data, setData] = useState<RetroData | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<BurndownSnapshot[]>([]);
  const [burndownLoading, setBurndownLoading] = useState(true);

  const [category, setCategory] = useState<Category | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sentiment, setSentiment] = useState(4);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [retro, stats] = await Promise.all([
        sprintApi<RetroData>("sprints/" + sprintId + "/retrospective"),
        sprintApi<MetricResponse>("sprints/" + sprintId + "/metrics"),
      ]);

      setData(retro);
      setMetrics(stats.metrics);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the retrospective.");
    }
  }, [sprintId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!data?.sprint.workspace_id) return;
    let current = true;

    workspaceApi
      .members(data.sprint.workspace_id)
      .then((result) => {
        if (current) setMembers(result);
      })
      .catch(() => {
        if (current) setMembers([]);
      });

    return () => {
      current = false;
    };
  }, [data?.sprint.workspace_id]);

  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (current) setBurndownLoading(true);
    });

    sprintApi<BurndownData>("sprints/" + sprintId + "/burndown")
      .then((result) => {
        if (current) setSnapshots(result.snapshots);
      })
      .catch(() => {
        if (current) setSnapshots([]);
      })
      .finally(() => {
        if (current) setBurndownLoading(false);
      });

    return () => {
      current = false;
    };
  }, [sprintId]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");

    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
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
      await sprintApi("sprints/" + sprintId + "/notes", "POST", payload);
      setCategory(null);
      setBody("");
      setAssignee("");
      setDueDate("");
    });
  }

  function addComment(note: RetroNote) {
    const comment = window.prompt("Comment on: " + note.body);
    if (!comment?.trim()) return;

    void run(() =>
      sprintApi(
        "sprints/" + sprintId + "/notes/" + note.id + "/comments",
        "POST",
        { body: comment.trim() },
      ),
    );
  }

  if (!data) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-surface-bright px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-xl rounded-2xl border border-border/40 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Icon name={error ? "error_outline" : "hourglass_top"} size={24} />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {error ? "Retrospective unavailable" : "Loading retrospective"}
          </h1>
          <p className="mt-2 text-sm text-muted" role={error ? "alert" : "status"}>
            {error || "Gathering sprint feedback and metrics…"}
          </p>
          {error && (
            <button type="button" onClick={() => void load()} className={primaryButtonClass + " mt-5"}>
              <Icon name="refresh" size={18} />
              Try again
            </button>
          )}
        </section>
      </main>
    );
  }

  const memberLabels = new Map(
    members.map((member) => [member.user_id, workspaceMemberLabel(member)] as const),
  );
  const getMemberLabel = (userId: string | null | undefined) => {
    if (!userId) return "Team member";
    return memberLabels.get(userId) ?? "Member " + userId.slice(0, 8);
  };

  const sprint = data.sprint;
  const isCompleted = sprint.status === "completed";
  const defaultSprintName = /^sprint\s+\d+$/i.test(sprint.name.trim());
  const sprintHeading = defaultSprintName
    ? sprint.goal
      ? "Sprint " + sprint.number + ": “" + sprint.goal + "”"
      : sprint.name
    : "Sprint " + sprint.number + ": “" + sprint.name + "”";
  const completedPoints = metrics?.completed_points ?? sprint.completed_points;
  const committedPoints =
    sprint.committed_points || metrics?.total_points || sprint.capacity_points;
  const completionPercent = metrics?.velocity_percent ?? 0;
  const progressValue = Math.min(100, Math.max(0, completionPercent));
  const percentLabel = Number(completionPercent.toFixed(1)).toLocaleString("en-US");
  const carryoverIssues = isCompleted
    ? sprint.carryover_issues
    : metrics?.open_issues ?? 0;
  const carryoverPoints = isCompleted
    ? sprint.carryover_points
    : metrics?.remaining_points ?? 0;
  const actionNotes = data.notes.filter((note) => note.category === "action");
  const inProgressActions = actionNotes.filter(
    (note) => note.action_status === "in_progress",
  ).length;
  const doneActions = actionNotes.filter((note) => note.action_status === "done").length;
  const visibleColumns =
    filterCategory === "all"
      ? columns
      : columns.filter((column) => column.id === filterCategory);

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] space-y-6 bg-surface-bright px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Link href="/projects" className="transition hover:text-accent">
            Planning
          </Link>
          <Icon name="chevron_right" size={18} className="text-outline" />
          <Link
            href={"/projects/" + sprint.project_id + "/sprints"}
            className="transition hover:text-accent"
          >
            Sprints &amp; Backlog
          </Link>
          <Icon name="chevron_right" size={18} className="text-outline" />
          <span className="rounded-md bg-accent/10 px-2.5 py-1 font-mono text-xs font-semibold text-accent-strong">
            SPRINT-{sprint.number}
          </span>
          <Icon name="chevron_right" size={18} className="text-outline" />
          <span className="font-semibold text-foreground">Retrospective &amp; Insights</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-900">
            <span className="size-2 rounded-full bg-emerald-700" />
            {sprint.retrospective_phase === "closed"
              ? "Retrospective published"
              : phaseLabels[sprint.retrospective_phase]}
            <span aria-hidden="true">·</span>
            {data.attendance_count} attendees
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-medium text-muted">
            <Icon name="lock" size={16} />
            {sprint.retrospective_phase === "closed"
              ? "Vote phase closed"
              : sprint.retrospective_phase === "voting"
                ? "Vote phase open"
                : "Feedback phase"}
          </span>
        </div>
      </div>

      <header className="flex flex-col gap-5 border-b border-border/30 pb-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-4xl text-[clamp(1.7rem,2.3vw,2.65rem)] font-semibold leading-tight tracking-tight text-foreground">
            {sprintHeading}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">
            Cadence: {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
            <span className="mx-2 text-outline" aria-hidden="true">•</span>
            {isCompleted ? "Concluded with" : "Currently at"}{" "}
            <strong className="font-semibold text-foreground">
              {completedPoints} of {committedPoints} pts
            </strong>{" "}
            burned ({percentLabel}% velocity completion)
          </p>
          {sprint.goal && !defaultSprintName && (
            <p className="mt-2 flex items-start gap-2 text-sm text-muted">
              <Icon name="flag" size={17} className="mt-0.5 shrink-0 text-accent" />
              <span>{sprint.goal}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 2xl:shrink-0">
          <a
            href={"/api/sprint/sprints/" + sprintId + "/report?format=md"}
            className={secondaryButtonClass}
          >
            <Icon name="download" size={18} />
            Export Markdown
          </a>
          <a
            href={"/api/sprint/sprints/" + sprintId + "/report?format=pdf"}
            className={secondaryButtonClass}
          >
            <Icon name="picture_as_pdf" size={18} />
            Export PDF
          </a>
          <button
            type="button"
            onClick={() => setCategory("action")}
            className={primaryButtonClass}
          >
            <Icon name="add_task" size={19} />
            Create Action Item
          </button>
        </div>
      </header>

      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/35 bg-white px-4 py-3 shadow-sm"
      >
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon
            name={sprint.retrospective_phase === "closed" ? "check_circle" : "forum"}
            size={19}
            className={sprint.retrospective_phase === "closed" ? "text-emerald-700" : "text-accent"}
          />
          <span>
            Retrospective phase:{" "}
            <strong className="font-semibold text-foreground">
              {phaseLabels[sprint.retrospective_phase]}
            </strong>
            {sprint.retrospective_phase === "closed" &&
              " — discussion and action items remain open."}
          </span>
        </p>

        {data.can_manage && sprint.retrospective_phase !== "closed" && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                sprintApi("sprints/" + sprintId + "/voting-phase", "PATCH", {}),
              )
            }
            className={secondaryButtonClass}
          >
            <Icon name="how_to_vote" size={18} />
            {sprint.retrospective_phase === "collecting" ? "Open voting" : "Close voting"}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <Icon name="error_outline" size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section aria-label="Sprint summary metrics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Velocity Output"
          icon="bolt"
          iconClass="bg-accent/10 text-accent"
          value={
            <>
              <span>{completedPoints}</span>
              <span className="text-lg font-medium text-muted">/ {committedPoints} pts</span>
            </>
          }
          detail={percentLabel + "% of committed points completed"}
        >
          <progress
            className="h-2 w-full accent-accent"
            value={progressValue}
            max={100}
            aria-label="Percent of committed sprint points completed"
          />
        </MetricCard>

        <MetricCard
          label={isCompleted ? "Sprint Carryover" : "Unfinished Work"}
          icon="swap_horiz"
          iconClass="bg-surface-high text-muted"
          value={
            <>
              <span>{carryoverIssues}</span>
              <span className="text-lg font-medium text-muted">
                {carryoverIssues === 1 ? "issue" : "issues"}
              </span>
            </>
          }
          detail={
            carryoverPoints +
            (carryoverPoints === 1 ? " point " : " points ") +
            (isCompleted ? "rolled over" : "remaining")
          }
        >
          <p className="text-xs font-medium text-muted">
            {isCompleted ? "Deferred to the next sprint" : "Still in the current scope"}
          </p>
        </MetricCard>

        <MetricCard
          label="Team Sentiment"
          icon="sentiment_satisfied"
          iconClass="bg-emerald-50 text-emerald-800"
          value={
            <>
              <span>
                {data.average_sentiment === null
                  ? "—"
                  : data.average_sentiment.toFixed(1)}
              </span>
              <span className="text-lg font-medium text-muted">/ 5.0</span>
            </>
          }
          detail={
            data.average_sentiment === null
              ? "No team ratings have been submitted"
              : "Average attendee rating"
          }
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
            <Icon name="groups" size={16} />
            {data.attendance_count} team check-ins
          </p>
        </MetricCard>

        <MetricCard
          label="Commitments"
          icon="task_alt"
          iconClass="bg-accent/10 text-accent"
          value={
            <>
              <span>{data.action_items}</span>
              <span className="text-lg font-medium text-muted">action items</span>
            </>
          }
          detail="Retrospective commitments"
        >
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-surface-low px-2.5 py-1 text-muted">
              {actionNotes.length - inProgressActions - doneActions} Assigned
            </span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-900">
              {inProgressActions} In progress
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">
              {doneActions} Done
            </span>
          </div>
        </MetricCard>
      </section>

      {category && (
        <form
          id="retro-note-form"
          onSubmit={submitNote}
          className="space-y-4 rounded-2xl border border-border/40 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                New feedback
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                Add {columns.find((column) => column.id === category)?.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close feedback form"
              onClick={() => setCategory(null)}
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-low hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name="close" />
            </button>
          </div>

          <label className="block text-sm font-medium text-foreground">
            Feedback
            <textarea
              required
              minLength={3}
              maxLength={2000}
              className={fieldClass + " mt-1.5 min-h-28 resize-y"}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Describe the feedback…"
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              Keep it specific and useful for the next sprint.
            </span>
          </label>

          {category === "action" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Assignee <span className="font-normal text-muted">(optional)</span>
                <select
                  className={fieldClass + " mt-1.5"}
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.user_id}>
                      {workspaceMemberLabel(member)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-foreground">
                Due date
                <input
                  type="date"
                  className={fieldClass + " mt-1.5"}
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button disabled={busy} className={primaryButtonClass}>
              <Icon name="save" size={18} />
              Save feedback
            </button>
          </div>
        </form>
      )}

      <section aria-label="Retrospective feedback board">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Sprint conversation
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Retrospective board
            </h2>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            <Icon name="filter_list" size={18} />
            <span className="sr-only">Filter feedback category</span>
            <select
              value={filterCategory}
              onChange={(event) =>
                setFilterCategory(event.target.value as Category | "all")
              }
              className="min-h-10 rounded-xl border border-border/50 bg-white px-3 pr-8 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">Category: All</option>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {visibleColumns.map((column) => {
            const notes = data.notes.filter((note) => note.category === column.id);

            return (
              <section
                key={column.id}
                aria-labelledby={"column-" + column.id}
                className="min-w-0 rounded-2xl border border-border/25 bg-surface-low p-3 sm:p-4"
              >
                <header className="mb-3 flex min-h-12 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={"size-2.5 shrink-0 rounded-full " + column.dot} />
                    <h3
                      id={"column-" + column.id}
                      className="min-w-0 font-semibold leading-6 tracking-tight text-foreground"
                    >
                      {column.title}
                    </h3>
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-high text-xs font-semibold text-muted">
                      {notes.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={"Add " + column.title}
                    onClick={() => setCategory(column.id)}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Icon name="add" />
                  </button>
                </header>

                <div className="space-y-3">
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className="overflow-clip rounded-xl border border-border/20 bg-white shadow-sm shadow-slate-900/5"
                    >
                      <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5">
                        {column.id === "action" ? (
                          <span
                            className={
                              "rounded-md px-2 py-1 text-[11px] font-semibold " +
                              statusBadgeClass(note.action_status)
                            }
                          >
                            {statusLabel(note.action_status)}
                          </span>
                        ) : (
                          <span
                            className={
                              "rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide " +
                              column.badge
                            }
                          >
                            Feedback
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={
                            busy || sprint.retrospective_phase !== "voting"
                          }
                          aria-pressed={note.voted}
                          aria-label={
                            (note.voted ? "Remove vote" : "Vote for") +
                            " this card. " +
                            note.vote_count +
                            " votes."
                          }
                          title={
                            sprint.retrospective_phase === "voting"
                              ? "Vote for this card"
                              : "Voting is closed"
                          }
                          onClick={() =>
                            void run(() =>
                              sprintApi(
                                "sprints/" +
                                  sprintId +
                                  "/notes/" +
                                  note.id +
                                  "/vote",
                                note.voted ? "DELETE" : "POST",
                                note.voted ? undefined : {},
                              ),
                            )
                          }
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 text-xs font-semibold text-accent-strong transition hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <Icon name={note.voted ? "thumb_up" : "thumb_up_off_alt"} size={16} />
                          {note.vote_count}
                        </button>
                      </div>

                      <p className="px-3.5 pb-4 pt-3 text-sm leading-6 text-foreground">
                        {note.body}
                      </p>

                      {column.id === "action" ? (
                        <div className="space-y-3 border-t border-border/25 px-3.5 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="person" size={16} />
                              {note.assignee_id ? "Assigned to a teammate" : "Unassigned"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="event" size={16} />
                              {note.due_date ? "Due " + formatDate(note.due_date) : "No due date"}
                            </span>
                          </div>
                          <label className="sr-only" htmlFor={"status-" + note.id}>
                            Action item status
                          </label>
                          <select
                            id={"status-" + note.id}
                            aria-label="Action item status"
                            value={note.action_status}
                            disabled={busy}
                            onChange={(event) =>
                              void run(() =>
                                sprintApi(
                                  "sprints/" + sprintId + "/notes/" + note.id,
                                  "PATCH",
                                  {
                                    action_status: event.target.value,
                                  },
                                ),
                              )
                            }
                            className="min-h-9 w-full rounded-lg border border-border/40 bg-surface-bright px-2.5 text-xs font-medium text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                          >
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      ) : (
                        <div className="border-t border-border/25 px-3.5 py-2.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                sprintApi(
                                  "sprints/" + sprintId + "/notes/" + note.id,
                                  "PATCH",
                                  {
                                    category: "action",
                                    action_status: "assigned",
                                  },
                                ),
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                          >
                            <Icon name="playlist_add" size={16} />
                            Convert to Action Item
                          </button>
                        </div>
                      )}

                      <footer className="flex items-center justify-between gap-2 border-t border-border/20 bg-surface-bright px-3.5 py-2.5">
                        <span className="inline-flex min-w-0 items-center gap-2 text-xs text-muted">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/10 text-accent-strong">
                            <Icon name="person" size={16} />
                          </span>
                          <span className="truncate" title={getMemberLabel(note.author_id)}>
                            {getMemberLabel(note.author_id)}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => addComment(note)}
                          aria-label={
                            "Add comment. " +
                            note.comments.length +
                            " comments on this card."
                          }
                          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-white hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                        >
                          <Icon name="chat_bubble_outline" size={16} />
                          {note.comments.length}
                        </button>
                      </footer>

                      {note.comments.length > 0 && (
                        <div className="space-y-2 border-t border-border/20 bg-white px-3.5 py-3">
                          {note.comments.map((comment) => (
                            <p key={comment.id} className="text-xs leading-5 text-muted">
                              <span className="font-semibold text-foreground">
                                {getMemberLabel(comment.author_id)}:
                              </span>{" "}
                              {comment.body}
                            </p>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}

                  {notes.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/60 bg-white/70 px-4 py-7 text-center">
                      <span className="mx-auto grid size-9 place-items-center rounded-xl bg-white text-outline shadow-sm">
                        <Icon name="notes" size={19} />
                      </span>
                      <p className="mt-2 text-sm font-medium text-muted">No feedback yet</p>
                      <p className="mt-1 text-xs text-outline">Add a card to start the discussion.</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCategory(column.id)}
                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-white hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Icon name="add" size={18} />
                  Add Feedback Card
                </button>
              </section>
            );
          })}
        </div>
      </section>

      <section aria-label="Sprint insights" className="grid gap-4 2xl:grid-cols-3">
        <section className="flex min-w-0 flex-col rounded-2xl border border-border/30 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-accent">
                <Icon name="auto_awesome" size={21} />
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  AI Theme Extraction
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Recurring patterns from the team’s feedback and comment threads.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="neurology" size={21} />
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {data.ai_themes.map((theme, index) => (
              <span
                key={theme + index}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface-low px-3 py-2 text-xs font-medium text-foreground"
              >
                <span
                  className={
                    "size-2 shrink-0 rounded-full " +
                    ["bg-emerald-700", "bg-red-700", "bg-indigo-600", "bg-violet-600"][
                      index % 4
                    ]
                  }
                />
                <span className="break-words">{theme}</span>
              </span>
            ))}
            {data.ai_themes.length === 0 && (
              <p className="w-full rounded-xl bg-surface-low px-3.5 py-4 text-sm text-muted">
                Generate themes to see shared patterns across this sprint’s feedback.
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/25 pt-5">
            <span className="text-xs text-muted">
              {data.notes.length} feedback {data.notes.length === 1 ? "card" : "cards"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  sprintApi("sprints/" + sprintId + "/themes", "POST", {}),
                )
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-accent transition hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <Icon name="refresh" size={17} />
              {data.ai_themes.length ? "Re-index themes" : "Generate themes"}
            </button>
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-2xl border border-border/30 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-accent">
                <Icon name="groups" size={21} />
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Active Attendance
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Team members who checked in during the retrospective.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900">
              {data.attendance_count} {data.attendance_count === 1 ? "person" : "people"}
            </span>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Icon name="group" size={27} />
            </span>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {data.attendance_count}
              </p>
              <p className="text-xs text-muted">attendees checked in</p>
            </div>
          </div>

          <div className="mt-auto border-t border-border/25 pt-4">
            <label className="block text-sm font-medium text-foreground">
              Your team sentiment
              <select
                className={fieldClass + " mt-1.5"}
                value={sentiment}
                onChange={(event) => setSentiment(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  sprintApi("sprints/" + sprintId + "/check-in", "POST", {
                    attended: true,
                    sentiment,
                  }),
                )
              }
              className={secondaryButtonClass + " mt-3 w-full"}
            >
              <Icon name="task_alt" size={18} />
              Submit check-in
            </button>
          </div>
        </section>

        <BurndownCard
          sprint={sprint}
          committedPoints={committedPoints}
          snapshots={snapshots}
          loading={burndownLoading}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-4">
        <p className="text-xs text-muted">
          Sprint {sprint.number} · {sprint.status.replace("_", " ")}
        </p>
        <Link
          href={"/projects/" + sprint.project_id + "/sprints"}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-accent transition hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Icon name="arrow_back" size={17} />
          Back to Sprint Planning
        </Link>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  iconClass,
  children,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: string;
  iconClass: string;
  children?: ReactNode;
}) {
  return (
    <article className="flex min-h-48 min-w-0 flex-col justify-between rounded-2xl border border-border/25 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">
            {label}
          </p>
          <span className={"grid size-10 shrink-0 place-items-center rounded-xl " + iconClass}>
            <Icon name={icon} size={21} />
          </span>
        </div>
        <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {value}
        </p>
      </div>
      <div className="mt-5">
        {children}
        <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
      </div>
    </article>
  );
}

function BurndownCard({
  sprint,
  committedPoints,
  snapshots,
  loading,
}: {
  sprint: Sprint;
  committedPoints: number;
  snapshots: BurndownSnapshot[];
  loading: boolean;
}) {
  const maxPoints = Math.max(
    1,
    committedPoints,
    ...snapshots.map((snapshot) => snapshot.total_points),
  );
  const start = new Date(sprint.start_date + "T00:00:00Z").getTime();
  const end = new Date(sprint.end_date + "T00:00:00Z").getTime();
  const duration = Math.max(1, end - start);
  const chartLeft = 48;
  const chartRight = 560;
  const chartTop = 26;
  const chartBottom = 162;
  const getX = (date: string) => {
    const time = new Date(date + "T00:00:00Z").getTime();
    return chartLeft + (chartRight - chartLeft) * ((time - start) / duration);
  };
  const getY = (points: number) =>
    chartTop + (chartBottom - chartTop) * (1 - points / maxPoints);
  const actualPoints = snapshots
    .map((snapshot) => getX(snapshot.date) + "," + getY(snapshot.remaining_points))
    .join(" ");

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border/30 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-accent">
          <Icon name="query_stats" size={21} />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Burndown Curve
          </h2>
        </div>
        <span className="text-xs font-medium text-muted">
          {loading
            ? "Loading history"
            : snapshots.length
              ? snapshots.length + " recorded snapshots"
              : "No history yet"}
        </span>
      </div>

      <svg
        viewBox="0 0 600 210"
        className="mt-4 h-48 w-full"
        role="img"
        aria-label="Planned and recorded sprint burndown curve"
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const y = 26 + index * 34;
          return (
            <line
              key={index}
              x1={chartLeft}
              y1={y}
              x2={chartRight}
              y2={y}
              stroke="var(--surface-high)"
              strokeWidth="1"
            />
          );
        })}
        <line
          x1={chartLeft}
          y1={getY(committedPoints)}
          x2={chartRight}
          y2={chartBottom}
          stroke="var(--outline)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        {snapshots.length > 0 && (
          <>
            <polyline
              points={actualPoints}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {snapshots.map((snapshot) => (
              <circle
                key={snapshot.date}
                cx={getX(snapshot.date)}
                cy={getY(snapshot.remaining_points)}
                r="4"
                fill="var(--accent)"
              >
                <title>
                  {formatDate(snapshot.date)}: {snapshot.remaining_points} points remaining
                </title>
              </circle>
            ))}
          </>
        )}
        <text x={chartLeft} y="194" fill="var(--outline)" fontSize="11">
          {formatDate(sprint.start_date)}
        </text>
        <text
          x={chartRight}
          y="194"
          fill="var(--outline)"
          fontSize="11"
          textAnchor="end"
        >
          {formatDate(sprint.end_date)}
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-0 w-5 border-t-2 border-dashed border-outline" />
          Planned scope ({committedPoints} pts)
        </span>
        <span className="inline-flex items-center gap-2 font-semibold text-foreground">
          <span className="h-0 w-5 border-t-[3px] border-accent" />
          Actual burn
        </span>
      </div>

      {!loading && snapshots.length === 0 && (
        <p className="mt-3 text-xs leading-5 text-muted">
          Daily snapshots will appear here as sprint history is recorded.
        </p>
      )}

      <Link
        href={"/reports/sprints/" + sprint.id}
        className="mt-auto inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-2 pt-4 text-sm font-semibold text-accent transition hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        View full burndown report
        <Icon name="arrow_forward" size={17} />
      </Link>
    </section>
  );
}
