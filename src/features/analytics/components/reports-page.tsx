"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import {
  DataTable,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/shared/workspace-page-ui";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

const field =
  "h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const softButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-surface-low";

export function ReportsPage() {
  const state = useDemoState();
  const [period, setPeriod] = useState("Month");
  const [reportRange, setReportRange] = useState("30");
  const [notice, setNotice] = useState("");
  const workspaceIssues = state.issues.filter(
    (issue) => issue.workspaceId === state.activeWorkspaceId,
  );
  const workspaceProjects = state.projects.filter(
    (project) => project.workspaceId === state.activeWorkspaceId && !project.archivedAt,
  );
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - Number(reportRange));
  const reportIssues = workspaceIssues.filter((issue) => new Date(issue.updatedAt) >= rangeStart);
  const closedSprints = state.sprints
    .filter(
      (sprint) => sprint.workspaceId === state.activeWorkspaceId && sprint.status === "Closed",
    )
    .sort((first, second) => first.endDate.localeCompare(second.endDate))
    .slice(period === "Month" ? -4 : -8);
  const sprintVelocity = closedSprints.map((sprint) => ({
    sprint,
    points: workspaceIssues
      .filter((issue) => issue.sprintId === sprint.id && issue.status === "Done")
      .reduce((sum, issue) => sum + issue.storyPoints, 0),
  }));
  const averageVelocity = sprintVelocity.length
    ? Math.round(
        sprintVelocity.reduce((sum, sprint) => sum + sprint.points, 0) / sprintVelocity.length,
      )
    : 0;
  const statusRows: Array<[string, number, string]> = [
    ["Done", "bg-emerald-500"],
    ["In Progress", "bg-violet-500"],
    ["In Review", "bg-amber-400"],
    ["To Do", "bg-slate-300"],
  ].map(([status, color]) => [
    status,
    reportIssues.filter((issue) => issue.status === status).length,
    color,
  ]);

  function exportIssuesCsv() {
    const rows = [
      ["Key", "Summary", "Project", "Status", "Priority", "Assignee", "Due date"],
      ...reportIssues.map((issue) => [
        issue.key,
        issue.title,
        workspaceProjects.find((project) => project.id === issue.projectId)?.name ?? "",
        issue.status,
        issue.priority,
        state.members.find((member) => member.id === issue.assigneeId)?.name ?? "",
        issue.dueDate ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "temora-workspace-issues.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${reportIssues.length} workspace issues as CSV.`);
  }

  return (
    <WorkspacePageShell>
      <WorkspacePageHeader
        title="Reports & Analytics"
        subtitle="Understand team delivery, sprint velocity, and project health."
        action={
          <div className="flex gap-2">
            <select
              className={field}
              value={reportRange}
              onChange={(event) => setReportRange(event.target.value)}
              aria-label="Report date range"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button className={softButton} onClick={exportIssuesCsv}>
              <Icon name="file_download" />
              Export
            </button>
          </div>
        }
      />
      {notice && (
        <p role="status" className="text-sm text-accent">
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Issues updated in range"
          value={String(reportIssues.length)}
          note={`Last ${reportRange} days`}
          icon="task_alt"
          tone="green"
        />
        <MetricCard
          label="Completed issues"
          value={String(reportIssues.filter((issue) => issue.status === "Done").length)}
          note="Current workspace"
          icon="avg_time"
          tone="green"
        />
        <MetricCard
          label="Sprint velocity"
          value={`${averageVelocity} pts`}
          note={`${sprintVelocity.length} closed sprints`}
          icon="speed"
        />
        <MetricCard
          label="Open issues"
          value={String(reportIssues.filter((issue) => issue.status !== "Done").length)}
          note="In selected range"
          icon="flag"
          tone="green"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelTitle
            title="Sprint velocity"
            trailing={
              <select
                className={field}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                aria-label="Sprint velocity period"
              >
                <option>Month</option>
                <option>Quarter</option>
              </select>
            }
          />
          <div className="flex h-64 items-end gap-3 border-b border-l border-border px-4 pb-1 pt-6">
            {sprintVelocity.length ? (
              sprintVelocity.map(({ sprint, points }) => (
                <div key={sprint.id} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className="rounded-t-md bg-accent/80"
                    style={{
                      height: `${Math.max(3, Math.round((points / Math.max(averageVelocity, 1)) * 70))}%`,
                    }}
                  />
                  <span className="mt-2 truncate text-center text-[10px] text-muted">
                    {sprint.name}
                  </span>
                </div>
              ))
            ) : (
              <p className="m-auto text-sm text-muted">
                Complete a sprint to see velocity history.
              </p>
            )}
          </div>
          <div className="mt-3 flex justify-center gap-5 text-xs text-muted">
            <span>■ Completed</span>
            <span>— Average {averageVelocity} pts</span>
          </div>
        </Panel>
        <Panel>
          <PanelTitle title="Issues by status" />
          <div className="space-y-5 py-3">
            {statusRows.map(([name, value, color]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{name}</span>
                  <strong>
                    {value} ·{" "}
                    {reportIssues.length ? Math.round((value / reportIssues.length) * 100) : 0}%
                  </strong>
                </div>
                <div className="h-2 rounded-full bg-surface-high">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{
                      width: `${reportIssues.length ? Math.round((value / reportIssues.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="xl:col-span-2">
          <PanelTitle title="Project health" />
          <DataTable
            headings={["Project", "Completion", "Open issues", "Health", "Lead"]}
            rows={workspaceProjects.map((project) => {
              const projectIssues = workspaceIssues.filter(
                (issue) => issue.projectId === project.id,
              );
              const openCount = projectIssues.filter((issue) => issue.status !== "Done").length;
              return [
                project.name,
                <span className="font-mono" key="progress">
                  {project.progress}%
                </span>,
                openCount,
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${project.status === "In Progress" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                  key="health"
                >
                  {project.status}
                </span>,
                state.members.find((member) => member.id === project.leadId)?.name ?? "Unassigned",
              ];
            })}
          />
        </Panel>
      </div>
    </WorkspacePageShell>
  );
}
