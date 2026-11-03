"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";
import { DEMO_TODAY } from "@/features/workspace/data/seed";

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BurndownReport({ sprintId }: { sprintId: string }) {
  const state = useDemoState();
  const sprint = state.sprints.find(
    (item) =>
      (item.id === sprintId || item.id === `sprint-${sprintId}`) &&
      item.workspaceId === state.activeWorkspaceId,
  );
  const issues = useMemo(
    () =>
      state.issues.filter(
        (issue) => issue.sprintId === sprint?.id && issue.workspaceId === state.activeWorkspaceId,
      ),
    [state.issues, state.activeWorkspaceId, sprint?.id],
  );
  if (!sprint)
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Sprint not found</h1>
        <Link href="/projects" className="mt-3 inline-block text-accent">
          Back to projects →
        </Link>
      </main>
    );

  const project = state.projects.find((item) => item.id === sprint.projectId);
  const completed = issues
    .filter((issue) => issue.status === "Done")
    .reduce((total, issue) => total + issue.storyPoints, 0);
  const total = issues.reduce((sum, issue) => sum + issue.storyPoints, 0);
  const remaining = total - completed;
  const remainingIssues = issues.filter((issue) => issue.status !== "Done");
  const start = new Date(`${sprint.startDate}T12:00:00`);
  const end = new Date(`${sprint.endDate}T12:00:00`);
  const today = new Date(`${DEMO_TODAY}T12:00:00`);
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const elapsedDays = Math.min(
    durationDays,
    Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000)),
  );
  const currentX = 24 + (552 * elapsedDays) / durationDays;
  const chartY = (points: number) => 18 + (total ? (168 * (total - points)) / total : 0);
  const idealRemaining = total * (1 - elapsedDays / durationDays);

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
            {project?.name ?? "Project"} / {sprint.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sprint burndown report</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Current remaining points are computed from issue status. Daily history and scope changes
            are not tracked in this demo.
          </p>
        </div>
        <Link
          href={`/projects/${sprint.projectId}/sprints`}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          Back to sprint planning
        </Link>
      </header>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-semibold text-accent">
              {sprint.name.toUpperCase()} · {sprint.status.toUpperCase()}
            </span>
            <h2 className="mt-1 text-lg font-semibold">{sprint.goal || "No sprint goal set"}</h2>
            <p className="mt-1 text-sm text-muted">
              {formatDate(sprint.startDate)}–{formatDate(sprint.endDate)}
            </p>
          </div>
          <span className="rounded-full bg-surface-low px-3 py-1.5 text-xs text-muted">
            Browser demo data
          </span>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Committed issues"
          value={String(issues.length)}
          note={`${total} story points`}
          icon="assignment"
        />
        <MetricCard
          label="Points completed"
          value={`${completed} / ${total}`}
          note="Issues marked Done"
          icon="task_alt"
        />
        <MetricCard
          label="Points remaining"
          value={String(remaining)}
          note={`${remainingIssues.length} open issues`}
          icon="trending_down"
        />
        <MetricCard
          label="Capacity"
          value={`${sprint.capacityPoints} pts`}
          note={sprint.status}
          icon="speed"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel>
          <PanelTitle title="Current burndown snapshot vs ideal guideline" />
          <div className="mt-4 rounded-xl border border-border bg-white p-4">
            <svg
              viewBox="0 0 600 210"
              className="h-64 w-full"
              role="img"
              aria-label={`Ideal burndown from ${total} to 0 points with ${remaining} points remaining in current snapshot`}
            >
              {[0, 1, 2, 3, 4].map((row) => {
                const y = 18 + row * 42;
                return (
                  <line key={row} x1="24" y1={y} x2="576" y2={y} stroke="#e4e5ef" strokeWidth="1" />
                );
              })}
              <text x="0" y="22" fontSize="10" fill="#777587">
                {total} pts
              </text>
              <text x="4" y="190" fontSize="10" fill="#777587">
                0 pts
              </text>
              <path
                d="M24 18 L576 186"
                fill="none"
                stroke="#aaa8bd"
                strokeWidth="2"
                strokeDasharray="7 6"
              />
              {sprint.status === "Active" && (
                <>
                  <line
                    x1={currentX}
                    y1="18"
                    x2={currentX}
                    y2="186"
                    stroke="#493ee5"
                    strokeOpacity=".15"
                  />
                  <circle
                    cx={currentX}
                    cy={chartY(idealRemaining)}
                    r="4"
                    fill="#aaa8bd"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <title>{Math.round(idealRemaining)} points on the ideal guideline</title>
                  </circle>
                  <circle
                    cx={currentX}
                    cy={chartY(remaining)}
                    r="7"
                    fill="#493ee5"
                    stroke="white"
                    strokeWidth="3"
                  />
                  <text
                    x={Math.min(510, currentX + 10)}
                    y={Math.max(32, chartY(remaining) - 10)}
                    fontSize="11"
                    fill="#493ee5"
                  >
                    {remaining} pts today
                  </text>
                </>
              )}
            </svg>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
              <span>┄ Ideal guideline</span>
              {sprint.status === "Active" && (
                <span className="text-accent">● Current snapshot</span>
              )}
              <span>Daily history is unavailable in demo data</span>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-outline">
                  {[
                    "Snapshot",
                    "Date",
                    "Points remaining",
                    "Points completed",
                    "Scope changes",
                  ].map((title) => (
                    <th scope="col" key={title} className="px-3 py-3 font-medium">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/70">
                  <th scope="row" className="px-3 py-3 font-medium">
                    Current issue state
                  </th>
                  <td className="px-3 py-3">{formatDate(DEMO_TODAY)}</td>
                  <td className="px-3 py-3">{remaining} pts</td>
                  <td className="px-3 py-3">{completed} pts</td>
                  <td className="px-3 py-3 text-muted">Not tracked</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className="h-fit">
          <PanelTitle title="Issues remaining" />
          <div className="space-y-3">
            {remainingIssues.map((issue) => (
              <Link
                key={issue.id}
                href={`/issues/${issue.key}`}
                className="block rounded-lg border border-border p-3 hover:border-accent"
              >
                <span className="font-mono text-xs font-semibold text-accent">{issue.key}</span>
                <span className="ml-2 text-xs text-muted">{issue.storyPoints} pts</span>
                <p className="mt-1 text-sm">{issue.title}</p>
              </Link>
            ))}
            {remainingIssues.length === 0 && (
              <p className="text-sm text-muted">All sprint issues are marked Done.</p>
            )}
          </div>
          <div className="mt-4 border-t border-border pt-4 text-xs text-muted">
            Scope changes and daily burndown history require event records that are not part of this
            frontend demo.
          </div>
        </Panel>
      </div>
    </main>
  );
}
