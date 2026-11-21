"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/shared/icon";
import { sprintApi, type Sprint } from "@/features/sprints/lib/api";

type Snapshot = {
  date: string;
  total_points: number;
  completed_points: number;
  remaining_points: number;
  total_issues: number;
  completed_issues: number;
};

type ReportIssue = {
  id: string;
  key: string;
  title: string;
  status: string;
  story_points: number | null;
  epic_id: string | null;
};

type Epic = { id: string; key: string; title: string };

type VelocityEntry = {
  number: number;
  name: string;
  committed_points: number;
  completed_points: number;
  completed_at: string | null;
};

type BurndownData = {
  sprint: Sprint;
  snapshots: Snapshot[];
  issues: ReportIssue[];
  epics: Epic[];
  issues_available: boolean;
  epic_breakdown_available: boolean;
  epic_breakdown_gap: string;
  issue_source: "completion_snapshot" | "current_issue_assignments";
  issue_history_complete: boolean;
  issue_history_gap: string;
  velocity_history: VelocityEntry[];
  scope_change_events_available: boolean;
  scope_change_gap: string;
};

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/50 bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : value + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function idealRemaining(sprint: Sprint, value: string) {
  const start = Date.parse(sprint.start_date + "T00:00:00Z");
  const end = Date.parse(sprint.end_date + "T00:00:00Z");
  const time = Date.parse(value + "T00:00:00Z");
  const duration = Math.max(1, end - start);
  const progress = Math.min(1, Math.max(0, (time - start) / duration));
  return Math.max(0, sprint.committed_points * (1 - progress));
}

export function BurndownReport({ sprintId }: { sprintId: string }) {
  const [data, setData] = useState<BurndownData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await sprintApi<BurndownData>(
        `sprints/${sprintId}/report?format=data`,
      );
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the sprint report.");
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (loading && !data) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-surface-bright px-4 py-8 sm:px-6 lg:px-8">
        <p role="status" className="mx-auto max-w-7xl animate-pulse text-sm text-muted">
          Loading sprint report…
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-surface-bright px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Sprint report could not be loaded</h1>
          <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>
          <button type="button" onClick={() => void load()} className={buttonClass + " mt-4"}>
            <Icon name="refresh" size={18} />
            Retry
          </button>
        </section>
      </main>
    );
  }

  const { sprint, snapshots, issues, epics, velocity_history: velocityHistory } = data;
  const latest = snapshots.at(-1);
  const completedIssuePoints = issues
    .filter((issue) => issue.status === "done")
    .reduce((sum, issue) => sum + (issue.story_points ?? 0), 0);
  const openIssuePoints = issues
    .filter((issue) => issue.status !== "done")
    .reduce((sum, issue) => sum + (issue.story_points ?? 0), 0);
  const completedPoints =
    latest?.completed_points ??
    (sprint.status === "completed" ? sprint.completed_points : completedIssuePoints);
  const remainingPoints =
    latest?.remaining_points ??
    (sprint.status === "completed" ? sprint.carryover_points : openIssuePoints);
  const completedIssueCount =
    latest?.completed_issues ??
    (sprint.status === "completed"
      ? sprint.completed_issues
      : issues.filter((issue) => issue.status === "done").length);
  const totalIssueCount =
    latest?.total_issues ?? issues.length;
  const scopeVariance = latest
    ? latest.total_points - sprint.committed_points
    : null;
  const avgVelocity = velocityHistory.length
    ? velocityHistory.reduce((sum, item) => sum + item.completed_points, 0) /
      velocityHistory.length
    : null;

  const epicLabels = new Map(epics.map((epic) => [epic.id, `${epic.key} · ${epic.title}`]));
  const epicGroups = new Map<string, { issues: number; points: number; completed: number }>();
  for (const issue of issues) {
    const label = issue.epic_id
      ? epicLabels.get(issue.epic_id) ?? `Epic ${issue.epic_id.slice(0, 8)}`
      : "No epic";
    const group = epicGroups.get(label) ?? { issues: 0, points: 0, completed: 0 };
    group.issues += 1;
    group.points += issue.story_points ?? 0;
    if (issue.status === "done") group.completed += issue.story_points ?? 0;
    epicGroups.set(label, group);
  }
  const epicBreakdown = [...epicGroups.entries()].sort(([left], [right]) => left.localeCompare(right));

  const maxPoints = Math.max(
    1,
    sprint.committed_points,
    ...snapshots.map((item) => Math.max(item.total_points, item.remaining_points)),
  );
  const startTime = Date.parse(sprint.start_date + "T00:00:00Z");
  const endTime = Date.parse(sprint.end_date + "T00:00:00Z");
  const duration = Math.max(1, endTime - startTime);
  const chart = { left: 64, right: 740, top: 26, bottom: 252 };
  const getX = (value: string) => {
    const time = Date.parse(value + "T00:00:00Z");
    return chart.left + (chart.right - chart.left) * ((time - startTime) / duration);
  };
  const getY = (points: number) =>
    chart.bottom - (chart.bottom - chart.top) * (points / maxPoints);
  const idealPoints =
    `${chart.left},${getY(sprint.committed_points)} ${chart.right},${getY(0)}`;
  const actualPoints = snapshots
    .map((item) => `${getX(item.date)},${getY(item.remaining_points)}`)
    .join(" ");
  const velocityMax = Math.max(1, ...velocityHistory.map((item) => item.completed_points));

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] space-y-6 bg-surface-bright px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="min-h-9 rounded-lg px-3 font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      <header className="flex flex-col gap-4 border-b border-border/30 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href={`/projects/${sprint.project_id}/sprints`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-white hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <Icon name="arrow_back" size={17} />
            Sprint Planning
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-accent">
            Sprint {sprint.number} · {sprint.status.replace("_", " ")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {sprint.name} Burndown Report
          </h1>
          <p className="mt-2 text-sm text-muted">
            {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
            {sprint.goal ? ` · ${sprint.goal}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/sprint/sprints/${sprintId}/report?format=burndown-csv`} className={buttonClass}>
            <Icon name="table_view" size={18} />
            Download report CSV
          </a>
          <a href={`/api/sprint/sprints/${sprintId}/report?format=burndown-pdf`} className={buttonClass}>
            <Icon name="picture_as_pdf" size={18} />
            Export PDF
          </a>
        </div>
      </header>

      <section aria-label="Sprint report summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Committed baseline" value={`${sprint.committed_points} pts`} detail={`${sprint.committed_issues} issues committed`} icon="flag" tone="accent" />
        <MetricCard label="Points completed" value={`${completedPoints} pts`} detail={`${completedIssueCount} of ${totalIssueCount} issues completed`} icon="task_alt" tone="green" />
        <MetricCard label="Points remaining" value={`${remainingPoints} pts`} detail={latest ? `Recorded ${formatDate(latest.date)}` : sprint.status === "completed" ? `${sprint.carryover_issues} issues carried over` : "From current issue assignments"} icon="hourglass_top" tone="blue" />
        <MetricCard label="Recorded scope variance" value={scopeVariance === null ? "—" : `${scopeVariance > 0 ? "+" : ""}${scopeVariance} pts`} detail={scopeVariance === null ? "No daily scope snapshot yet" : "Latest recorded total points minus commitment"} icon="swap_vert" tone="violet" />
      </section>

      <section aria-labelledby="burndown-heading" className="rounded-2xl border border-border/30 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Daily progress</p>
            <h2 id="burndown-heading" className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">Ideal vs. actual burndown</h2>
            <p className="mt-1 text-sm text-muted">The ideal line is a calendar-day guide from the committed baseline. Actual values come from recorded snapshots.</p>
          </div>
          <span className="rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-muted">
            {snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"}
          </span>
        </div>

        {snapshots.length ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-low p-2 sm:p-4" role="region" aria-label="Burndown chart" tabIndex={0}>
              <svg viewBox="0 0 780 310" className="block h-64 min-w-[620px] w-full sm:h-80" role="img" aria-label={`Ideal and actual burndown for ${sprint.name}. Latest recorded remaining points: ${latest?.remaining_points ?? 0}.`}>
                {[0, 1, 2, 3, 4].map((index) => {
                  const value = (maxPoints * (4 - index)) / 4;
                  const y = chart.top + ((chart.bottom - chart.top) * index) / 4;
                  return (
                    <g key={index}>
                      <line x1={chart.left} y1={y} x2={chart.right} y2={y} stroke="var(--surface-high)" strokeWidth="1" />
                      <text x={chart.left - 12} y={y + 4} textAnchor="end" fill="var(--outline)" fontSize="11">{value.toFixed(value % 1 ? 1 : 0)}</text>
                    </g>
                  );
                })}
                <polyline points={idealPoints} fill="none" stroke="var(--outline)" strokeWidth="2" strokeDasharray="7 6" />
                <polyline points={actualPoints} fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                {snapshots.map((item) => (
                  <circle key={item.date} cx={getX(item.date)} cy={getY(item.remaining_points)} r="4.5" fill="var(--accent)">
                    <title>{formatDate(item.date)}: {item.remaining_points} points remaining</title>
                  </circle>
                ))}
                <text x={chart.left} y="284" fill="var(--outline)" fontSize="11">{formatDate(sprint.start_date)}</text>
                <text x={chart.right} y="284" textAnchor="end" fill="var(--outline)" fontSize="11">{formatDate(sprint.end_date)}</text>
                <text x="15" y="22" fill="var(--muted)" fontSize="11">Story points</text>
              </svg>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-outline" />Ideal remaining points guide</span>
              <span className="inline-flex items-center gap-2 font-semibold text-foreground"><span className="w-6 border-t-[3px] border-accent" />Recorded actual remaining</span>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border/50 bg-surface-low/60 px-4 py-8 text-center">
            <Icon name="monitoring" size={25} className="mx-auto text-outline" />
            <p className="mt-2 text-sm font-medium text-foreground">No daily snapshots recorded</p>
            <p className="mt-1 text-xs text-muted">The report will draw actual progress once the sprint service records daily history.</p>
          </div>
        )}
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section aria-labelledby="epic-heading" className="min-w-0 rounded-2xl border border-border/30 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Scope distribution</p>
              <h2 id="epic-heading" className="mt-1 text-lg font-semibold">Epic breakdown</h2>
            </div>
            <span className="rounded-full bg-surface-low px-3 py-1.5 text-xs text-muted">
              {data.issue_source === "completion_snapshot" ? "Completed issue snapshot" : "Current assignments"}
            </span>
          </div>
          {data.epic_breakdown_available && epicBreakdown.length ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/25" role="region" aria-label="Epic breakdown table" tabIndex={0}>
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">Issue and story point totals by epic</caption>
                <thead className="bg-surface-low text-xs uppercase tracking-wide text-muted">
                  <tr><th scope="col" className="px-3 py-3 font-semibold">Epic</th><th scope="col" className="px-3 py-3 text-right font-semibold">Issues</th><th scope="col" className="px-3 py-3 text-right font-semibold">Estimated points</th><th scope="col" className="px-3 py-3 text-right font-semibold">Completed points</th></tr>
                </thead>
                <tbody>
                  {epicBreakdown.map(([label, values]) => (
                    <tr key={label} className="border-t border-border/20">
                      <th scope="row" className="max-w-0 truncate px-3 py-3 font-medium" title={label}>{label}</th>
                      <td className="px-3 py-3 text-right tabular-nums">{values.issues}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{values.points}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{values.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-surface-low px-4 py-6 text-sm text-muted">
              {!data.epic_breakdown_available
                ? data.epic_breakdown_gap || data.issue_history_gap
                : sprint.status === "completed" && !data.issue_history_complete
                  ? "The original issue snapshot is unavailable for this completed sprint."
                  : "No issues are recorded in this sprint snapshot."}
            </p>
          )}
          {data.issue_history_gap && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-950">
              {data.issue_history_gap}
            </p>
          )}
        </section>

        <section aria-labelledby="velocity-heading" className="min-w-0 rounded-2xl border border-border/30 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Delivery trend</p>
              <h2 id="velocity-heading" className="mt-1 text-lg font-semibold">Historical velocity</h2>
            </div>
            <div className="rounded-xl bg-accent/10 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Recorded average</p>
              <p className="mt-0.5 text-lg font-semibold text-accent">{avgVelocity === null ? "—" : `${avgVelocity.toFixed(1)} pts`}</p>
            </div>
          </div>
          {velocityHistory.length ? (
            <div className="mt-5 space-y-4">
              {velocityHistory.map((item) => (
                <div key={item.number} className="grid grid-cols-[minmax(5.5rem,0.8fr)_minmax(4rem,2fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                    <p className="text-xs text-muted">{formatDate(item.completed_at)}</p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-high" role="img" aria-label={`${item.completed_points} completed points out of ${velocityMax} point scale`}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (item.completed_points / velocityMax) * 100)}%` }} />
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold tabular-nums">{item.completed_points} <span className="font-normal text-muted">/ {item.committed_points} pts</span></p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-surface-low px-4 py-6 text-sm text-muted">No completed sprint velocity is recorded for this project yet.</p>
          )}
          <p className="mt-4 border-t border-border/25 pt-3 text-xs leading-5 text-muted">Velocity uses completed_points saved on completed sprints in this project.</p>
        </section>
      </div>

      <section aria-labelledby="history-heading" className="rounded-2xl border border-border/30 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Recorded service data</p>
            <h2 id="history-heading" className="mt-1 text-lg font-semibold">Daily sprint history</h2>
          </div>
          <span className="text-xs text-muted">{snapshots.length} recorded {snapshots.length === 1 ? "day" : "days"}</span>
        </div>
        {snapshots.length ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/25" role="region" aria-label="Daily sprint history table" tabIndex={0}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Recorded daily sprint scope and completion values</caption>
              <thead className="bg-surface-low text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-3 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Ideal remaining guide</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Recorded total</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Completed</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Remaining</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Issues done</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Total issues</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((item) => (
                  <tr key={item.date} className="border-t border-border/20">
                    <th scope="row" className="whitespace-nowrap px-3 py-3 font-medium">{formatDate(item.date)}</th>
                    <td className="px-3 py-3 text-right tabular-nums">{idealRemaining(sprint, item.date).toFixed(1)} pts</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.total_points} pts</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.completed_points} pts</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.remaining_points} pts</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.completed_issues}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.total_issues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-low px-4 py-6 text-sm text-muted">Daily history will appear here after the Sprint service records a snapshot.</p>
        )}
      </section>

      {!data.scope_change_events_available && (
        <section aria-labelledby="scope-gap-heading" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Icon name="info" size={20} className="mt-0.5 shrink-0 text-amber-800" />
            <div>
              <h2 id="scope-gap-heading" className="font-semibold text-amber-950">Scope change history is not available</h2>
              <p className="mt-1 text-sm leading-6 text-amber-950">{data.scope_change_gap}</p>
            </div>
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-4">
        <p className="text-xs text-muted">Data source: Sprint burndown snapshots and completed project sprints.</p>
        <Link href={`/projects/${sprint.project_id}/sprints`} className={buttonClass}>
          <Icon name="arrow_back" size={17} />
          Back to Sprint Planning
        </Link>
      </footer>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: "accent" | "green" | "blue" | "violet";
}) {
  const colors = {
    accent: "bg-accent/10 text-accent",
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-sky-100 text-sky-800",
    violet: "bg-violet-100 text-violet-800",
  };

  return (
    <article className="flex min-h-36 flex-col justify-between rounded-2xl border border-border/25 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${colors[tone]}`}><Icon name={icon} size={21} /></span>
      </div>
      <div>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
      </div>
    </article>
  );
}
