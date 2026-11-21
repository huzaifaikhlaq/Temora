"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/shared/icon";
import {
  sprintApi,
  type Sprint,
  type SprintIssue,
  type SprintMetrics,
} from "@/features/sprints/lib/api";

type Destination = {
  id: string;
  name: string;
  status: Sprint["status"];
  capacity_points: number;
  start_date: string;
  end_date: string;
};

type CompletionSnapshot = {
  issues?: SprintIssue[];
  metrics?: SprintMetrics;
  moved_issue_ids?: string[];
  target_sprint_id?: string | null;
};

type CompletionPlan = {
  mode: Mode;
  target_sprint_id: string | null;
  selected_issue_ids: string[] | null;
};

type Preview = {
  sprint: Sprint;
  issues?: SprintIssue[];
  open_issues?: SprintIssue[];
  metrics?: SprintMetrics;
  destinations?: Destination[];
  destination?: Destination | null;
  pending?: boolean;
  plan?: CompletionPlan;
  snapshot?: CompletionSnapshot;
};

type Mode = "next" | "backlog" | "new";

const inputClass =
  "w-full rounded-xl border border-border/60 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-outline focus:border-accent focus:ring-2 focus:ring-accent/20";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export function SprintCompletionPanel({ sprintId }: { sprintId: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<Mode>("next");
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newCapacity, setNewCapacity] = useState(40);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (preserveSelection = false) => {
    setLoading(true);
    setError("");
    try {
      const result = await sprintApi<Preview>(`sprints/${sprintId}/complete`);
      setPreview(result);

      if (!preserveSelection) {
        const issueList = result.open_issues ?? result.snapshot?.issues?.filter((issue) => issue.status !== "done") ?? [];
        const planned = result.snapshot?.moved_issue_ids ?? result.plan?.selected_issue_ids;
        setSelected(planned ?? issueList.map((issue) => issue.id));
        if (result.plan?.mode) setMode(result.plan.mode);
        else setMode(result.destinations?.length ? "next" : "backlog");
        if (result.plan?.target_sprint_id) setTarget(result.plan.target_sprint_id);
        else if (result.destinations?.length) setTarget(result.destinations[0].id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the completion preview.");
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    let current = true;
    queueMicrotask(() => {
      if (current) void load();
    });
    return () => {
      current = false;
      if (dialog?.open) dialog.close();
    };
  }, [load]);

  const issues = preview?.issues ?? preview?.snapshot?.issues ?? [];
  const openIssues = preview?.open_issues ?? issues.filter((issue) => issue.status !== "done");
  const metrics = preview?.metrics ?? preview?.snapshot?.metrics;
  const destinations = preview?.destinations ?? [];
  const chosen = destinations.find((item) => item.id === target) ?? preview?.destination ?? null;
  const completedIssues = issues.filter((issue) => issue.status === "done");
  const hasIssueSnapshot = Boolean(preview?.issues || preview?.snapshot?.issues);
  const completedPoints = metrics?.completed_points ?? (
    hasIssueSnapshot
      ? completedIssues.reduce((sum, issue) => sum + (issue.story_points ?? 0), 0)
      : preview?.sprint.completed_points ?? 0
  );
  const openPoints = metrics?.remaining_points ?? (
    hasIssueSnapshot
      ? openIssues.reduce((sum, issue) => sum + (issue.story_points ?? 0), 0)
      : preview?.sprint.carryover_points ?? 0
  );
  const openIssueCount = metrics?.open_issues ?? (
    hasIssueSnapshot ? openIssues.length : preview?.sprint.carryover_issues ?? 0
  );
  const selectedIssues = openIssues.filter((issue) => selected.includes(issue.id));
  const selectedPoints = selectedIssues.reduce((sum, issue) => sum + (issue.story_points ?? 0), 0);
  const completed = preview?.sprint.status === "completed";
  const hasMovedIssueSnapshot = Array.isArray(preview?.snapshot?.moved_issue_ids);
  const movedIssueCount = hasMovedIssueSnapshot
    ? preview?.snapshot?.moved_issue_ids?.length ?? 0
    : preview?.sprint.carryover_issues ?? 0;
  const movedIssuePoints = hasMovedIssueSnapshot
    ? selectedPoints
    : preview?.sprint.carryover_points ?? 0;
  const rolloverIssueCount = completed ? movedIssueCount : selectedIssues.length;
  const rolloverPoints = completed ? movedIssuePoints : selectedPoints;
  const closeHref = preview
    ? `/projects/${preview.sprint.project_id}/sprints`
    : "/projects";

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function cancelDialog() {
    if (preview) router.push(closeHref);
    else router.back();
  }

  async function complete() {
    if (completed) {
      router.push(`/sprints/${sprintId}/retrospective`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = preview?.pending
        ? {}
        : {
            mode,
            target_sprint_id: mode === "next" ? target : undefined,
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

      await sprintApi(`sprints/${sprintId}/complete`, "POST", payload);
      router.push(`/sprints/${sprintId}/retrospective`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sprint completion failed.");
      await load(true);
    } finally {
      setBusy(false);
    }
  }

  const submitDisabled =
    busy || loading || (!preview?.pending && !completed && mode === "next" && !target) ||
    (!preview?.pending && mode === "new" && (!newName.trim() || !newStart || !newEnd));

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-surface-bright px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={closeHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-white hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <Icon name="arrow_back" size={18} />
          Back to Sprint Planning
        </Link>
        <section className="mt-5 rounded-2xl border border-border/30 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Sprint operations</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Complete sprint</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review the recorded sprint results and choose where unfinished work should go.</p>
        </section>
      </div>

      <dialog
        ref={dialogRef}
        className="sprint-modal m-auto max-h-[min(92dvh,58rem)] w-[min(100%-2rem,68rem)] max-w-none overflow-y-auto rounded-2xl border border-border/30 bg-white p-0 text-foreground shadow-2xl"
        aria-labelledby="complete-sprint-title"
        onCancel={(event) => {
          event.preventDefault();
          cancelDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) cancelDialog();
        }}
      >
        <div className="border-b border-border/25 bg-surface-low/60 px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent"><Icon name="task_alt" size={23} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-accent">Sprint closeout</p>
                <h2 id="complete-sprint-title" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                  {preview ? preview.sprint.name : "Complete sprint"}
                </h2>
                {preview && <p className="mt-1 text-sm text-muted">Sprint {preview.sprint.number} · {preview.sprint.start_date} – {preview.sprint.end_date}</p>}
              </div>
            </div>
            <button type="button" aria-label="Close completion dialog" onClick={cancelDialog} className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-7">
          {loading && !preview ? (
            <p role="status" className="animate-pulse rounded-xl bg-surface-low px-4 py-8 text-center text-sm text-muted">Loading completion preview…</p>
          ) : error && !preview ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p role="alert" className="text-sm text-red-800">{error}</p>
              <button type="button" onClick={() => void load()} className={secondaryButtonClass + " mt-3"}><Icon name="refresh" size={18} />Retry preview</button>
            </div>
          ) : preview ? (
            <>
              {completed ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                  This sprint has already been completed. Its saved completion snapshot is shown below. Opening the retrospective is safe.
                </div>
              ) : preview.pending ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-950">A completion operation is already in progress.</p>
                  <p className="mt-1 text-sm leading-6 text-amber-950">Resume uses the saved operation and rollover plan, so the same issues will not be moved twice.</p>
                </div>
              ) : null}

              <section aria-label="Completion metrics" className="grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Completed" value={`${metrics?.completed_issues ?? (hasIssueSnapshot ? completedIssues.length : preview.sprint.completed_issues)} issues`} points={`${completedPoints} story points`} icon="check_circle" tone="green" />
                <SummaryCard label="Unfinished" value={`${openIssueCount} issues`} points={`${openPoints} story points`} icon="pending_actions" tone="amber" />
                <SummaryCard label={completed ? "Moved at closeout" : "Selected to move"} value={`${rolloverIssueCount} issues`} points={`${rolloverPoints} story points`} icon="move_down" tone="accent" />
              </section>

              {!completed && !preview.pending && (
                <section aria-labelledby="rollover-destination-heading" className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-accent">Unfinished commitments</p>
                    <h3 id="rollover-destination-heading" className="mt-1 text-lg font-semibold">Choose a rollover destination</h3>
                    <p className="mt-1 text-sm text-muted">Select the work to move. Unselected issues remain in this sprint’s completion history.</p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <DestinationCard title="Eligible sprint" detail="Move the selected work into another open sprint." selected={mode === "next"} disabled={!destinations.length} onSelect={() => setMode("next")} icon="arrow_forward" />
                    <DestinationCard title="Product backlog" detail="Return selected work to the unscheduled backlog." selected={mode === "backlog"} onSelect={() => setMode("backlog")} icon="inventory_2" />
                    <DestinationCard title="New sprint" detail="Create a future sprint and move selected work into it." selected={mode === "new"} onSelect={() => setMode("new")} icon="add_circle" />
                  </div>

                  {mode === "next" && (
                    <label className="block text-sm font-medium">Destination sprint
                      <select required value={target} onChange={(event) => setTarget(event.target.value)} disabled={!destinations.length} className={inputClass + " mt-1.5"}>
                        {destinations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "active" ? "Active" : "Planned"} · {item.capacity_points} pts capacity</option>)}
                        {!destinations.length && <option value="">No eligible sprint is available</option>}
                      </select>
                    </label>
                  )}

                  {mode === "new" && (
                    <div className="grid gap-3 rounded-2xl border border-border/25 bg-surface-low/60 p-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium sm:col-span-2">New sprint name
                        <input required maxLength={120} value={newName} onChange={(event) => setNewName(event.target.value)} className={inputClass + " mt-1.5"} placeholder={`Sprint ${preview.sprint.number + 1}`} />
                      </label>
                      <label className="block text-sm font-medium">Start date
                        <input required type="date" value={newStart} onChange={(event) => setNewStart(event.target.value)} className={inputClass + " mt-1.5"} />
                      </label>
                      <label className="block text-sm font-medium">End date
                        <input required type="date" min={newStart || undefined} value={newEnd} onChange={(event) => setNewEnd(event.target.value)} className={inputClass + " mt-1.5"} />
                      </label>
                      <label className="block text-sm font-medium">Capacity points
                        <input required type="number" min={1} max={100000} value={newCapacity} onChange={(event) => setNewCapacity(Number(event.target.value))} className={inputClass + " mt-1.5"} />
                      </label>
                    </div>
                  )}
                </section>
              )}

              <section aria-labelledby="unfinished-preview-heading" className="rounded-2xl border border-border/25 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/20 bg-surface-low/50 px-4 py-3">
                  <div>
                    <h3 id="unfinished-preview-heading" className="font-semibold">Unfinished issue preview</h3>
                    <p className="mt-0.5 text-xs text-muted">{openIssueCount} issues · {openPoints} story points</p>
                  </div>
                  {!preview.pending && !completed && openIssues.length > 0 && (
                    <button type="button" onClick={() => setSelected(selected.length === openIssues.length ? [] : openIssues.map((issue) => issue.id))} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                      {selected.length === openIssues.length ? "Clear selection" : "Select all unfinished"}
                    </button>
                  )}
                </header>
                <div className="max-h-72 overflow-y-auto overscroll-contain p-3">
                  {openIssues.map((issue) => (
                    <label key={issue.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-border/15 px-2 py-2 last:border-0 hover:bg-surface-bright">
                      <input type="checkbox" checked={selectedSet.has(issue.id)} disabled={preview.pending || completed} onChange={() => setSelected((current) => currentSetToggle(current, issue.id))} className="size-4 shrink-0 accent-accent" />
                      <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 font-mono text-xs font-semibold text-accent">{issue.key}</span>
                      <span className="min-w-0 flex-1 truncate text-sm" title={issue.title}>{issue.title}</span>
                      <span className="shrink-0 text-xs text-muted">{issue.story_points ?? 0} pts</span>
                    </label>
                  ))}
                  {openIssues.length === 0 && (
                    <p className="px-3 py-7 text-center text-sm text-muted">
                      {openIssueCount > 0
                        ? `Issue details are unavailable in this saved snapshot. The completion record contains ${openIssueCount} unfinished issues.`
                        : "No unfinished issues in this sprint snapshot."}
                    </p>
                  )}
                </div>
              </section>

              <section aria-label="Rollover summary" className="grid gap-3 rounded-2xl bg-surface-low p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rollover destination</p>
                  <p className="mt-1 font-semibold">
                    {preview.pending
                      ? preview.plan?.mode === "backlog" ? "Product backlog" : preview.destination?.name ?? "Saved destination"
                      : completed
                        ? preview.snapshot?.target_sprint_id ? preview.destination?.name ?? "Saved sprint destination" : "Product backlog"
                      : mode === "next" ? chosen?.name ?? "Choose an eligible sprint" : mode === "backlog" ? "Product backlog" : newName || "New sprint"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {preview.pending ? "Saved operation destination" : mode === "next" ? chosen ? `${chosen.capacity_points} pts capacity · ${chosen.start_date} to ${chosen.end_date}` : "Choose an eligible destination sprint" : mode === "new" ? `${newCapacity} pts planned capacity` : "Unfinished issues will be unscheduled"}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 sm:text-right">
                  <p className="text-lg font-semibold">{rolloverIssueCount} <span className="text-sm font-medium text-muted">issues</span></p>
                  <p className="text-xs text-muted">{rolloverPoints} points {completed ? "moved" : "selected"}</p>
                </div>
              </section>

              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            </>
          ) : null}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/25 pt-4">
            <Link href={closeHref} className={secondaryButtonClass}>Cancel</Link>
            <button type="button" disabled={submitDisabled || (!preview && !completed)} onClick={() => void complete()} className={primaryButtonClass}>
              <Icon name={completed ? "forum" : "check_circle"} size={19} />
              {busy ? "Completing…" : completed ? "Open Retrospective" : preview?.pending ? "Resume Completion" : "Complete Sprint & Rollover"}
            </button>
          </footer>
        </div>
      </dialog>
    </main>
  );
}

function currentSetToggle(current: string[], issueId: string) {
  return current.includes(issueId)
    ? current.filter((id) => id !== issueId)
    : [...current, issueId];
}

function DestinationCard({
  title,
  detail,
  selected,
  disabled = false,
  icon,
  onSelect,
}: {
  title: string;
  detail: string;
  selected: boolean;
  disabled?: boolean;
  icon: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`min-h-28 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border/35 bg-white hover:bg-surface-bright"}`}
    >
      <span className={`grid size-9 place-items-center rounded-xl ${selected ? "bg-accent/10 text-accent" : "bg-surface-low text-muted"}`}><Icon name={icon} size={20} /></span>
      <span className="mt-3 block font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted">{detail}</span>
    </button>
  );
}

function SummaryCard({
  label,
  value,
  points,
  icon,
  tone,
}: {
  label: string;
  value: string;
  points: string;
  icon: string;
  tone: "green" | "amber" | "accent";
}) {
  const colors = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-900",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <article className="flex min-h-32 items-start justify-between gap-3 rounded-2xl border border-border/25 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="mt-3 text-xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted">{points}</p>
      </div>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${colors[tone]}`}><Icon name={icon} size={21} /></span>
    </article>
  );
}
