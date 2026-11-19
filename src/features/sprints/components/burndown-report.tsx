"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  sprintApi,
  type Sprint,
} from "@/features/sprints/lib/api";

type Snapshot = {
  date: string;
  total_points: number;
  completed_points: number;
  remaining_points: number;
  total_issues: number;
  completed_issues: number;
};

type BurndownData = {
  sprint: Sprint;
  snapshots: Snapshot[];
};

export function BurndownReport({
  sprintId,
}: {
  sprintId: string;
}) {
  const [data, setData] = useState<BurndownData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    sprintApi<BurndownData>(
      `sprints/${sprintId}/burndown`,
    )
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Load failed",
        ),
      );
  }, [sprintId]);

  if (!data) {
    return <main className="p-8">{error || "Loading report..."}</main>;
  }

  const { sprint, snapshots } = data;

  const maxPoints = Math.max(
    1,
    sprint.committed_points,
    ...snapshots.map((item) => item.total_points),
  );

  const start = Date.parse(`${sprint.start_date}T00:00:00Z`);
  const end = Date.parse(`${sprint.end_date}T00:00:00Z`);
  const duration = Math.max(1, end - start);

  const getX = (date: string) => {
    const time = Date.parse(`${date}T00:00:00Z`);
    return 40 + (520 * (time - start)) / duration;
  };

  const getY = (points: number) =>
    200 - (160 * points) / maxPoints;

  const actual = snapshots
    .map(
      (item) =>
        `${getX(item.date)},${getY(item.remaining_points)}`,
    )
    .join(" ");

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <p className="text-xs uppercase text-accent">
          Sprint {sprint.number}
        </p>

        <h1 className="text-2xl font-bold">
          {sprint.name} — Burndown Report
        </h1>

        <p className="text-sm text-muted">
          {sprint.start_date} — {sprint.end_date}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted">
            Original Commitment
          </p>
          <strong className="text-2xl">
            {sprint.committed_points} pts
          </strong>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted">
            Completed
          </p>
          <strong className="text-2xl">
            {sprint.completed_points} pts
          </strong>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted">
            Carryover
          </p>
          <strong className="text-2xl">
            {sprint.carryover_points} pts
          </strong>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">
          Sprint Burndown
        </h2>

        <svg
          viewBox="0 0 600 240"
          className="mt-6 h-72 w-full"
          role="img"
          aria-label="Ideal and actual sprint burndown chart"
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const y = 40 + 40 * i;

            return (
              <line
                key={i}
                x1="40"
                y1={y}
                x2="560"
                y2={y}
                stroke="#e5e7eb"
              />
            );
          })}

          <line
            x1="40"
            y1={getY(sprint.committed_points)}
            x2="560"
            y2={getY(0)}
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="6 5"
          />

          {snapshots.length > 0 && (
            <polyline
              points={actual}
              fill="none"
              stroke="#5145e5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {snapshots.map((item) => (
            <circle
              key={item.date}
              cx={getX(item.date)}
              cy={getY(item.remaining_points)}
              r="4"
              fill="#5145e5"
            >
              <title>
                {item.date}: {item.remaining_points} pts
              </title>
            </circle>
          ))}
        </svg>

        <div className="flex gap-5 text-xs text-muted">
          <span>Dashed: ideal burndown</span>
          <span>Solid: recorded actual burndown</span>
        </div>

        {!snapshots.length && (
          <p className="mt-4 text-sm text-muted">
            No historical snapshots have been recorded yet.
          </p>
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white p-5">
        <h2 className="mb-4 font-semibold">
          Daily Sprint History
        </h2>

        <table className="w-full min-w-[550px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Date</th>
              <th className="p-3">Total Points</th>
              <th className="p-3">Completed</th>
              <th className="p-3">Remaining</th>
            </tr>
          </thead>

          <tbody>
            {snapshots.map((item) => (
              <tr key={item.date} className="border-b">
                <td className="p-3">{item.date}</td>
                <td className="p-3">{item.total_points}</td>
                <td className="p-3">{item.completed_points}</td>
                <td className="p-3">{item.remaining_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Link
        href={`/projects/${sprint.project_id}/sprints`}
        className="text-sm text-accent"
      >
        Back to Sprint Planning
      </Link>
    </main>
  );
}