"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import {
  AdvancedPage,
  type AdvancedPageKind,
} from "@/features/workspace/components/advanced-pages";
import { ProjectsDirectory } from "@/features/projects/components/projects-directory";
import { BillingPage } from "@/features/billing/components/billing-page";
import { MembersDirectory } from "@/features/members/components/members-directory";
import { InboxPage } from "@/features/notifications/components/inbox-page";
import { WorkspaceSettingsPage } from "@/features/settings/components/workspace-settings-page";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type PageKind =
  | "projects"
  | "billing"
  | "members"
  | "inbox"
  | "integrations"
  | "reports"
  | "calendar"
  | "settings"
  | "not-found"
  | "forbidden"
  | "roles"
  | "retrospective"
  | "automation"
  | "audit";
const shell = "mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8";
const button =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong";
const softButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-surface-low";
const field =
  "h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-outline">
          Northstar Studio / Workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Table({ headings, rows }: { headings: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-outline">
            {headings.map((h) => (
              <th key={h} className="px-3 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/70 last:border-0 hover:bg-surface-low/60">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-3.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdditionalPage({ kind }: { kind: PageKind }) {
  const demoState = useDemoState();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Month");
  const [reportRange, setReportRange] = useState("30");
  const [notice, setNotice] = useState("");
  const [simulatedConnections, setSimulatedConnections] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const calendarFirstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const calendarGridStart = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1 - calendarFirstDay.getDay(),
  );
  const calendarEvents = new Map<string, string[]>();
  const workspaceIssues = demoState.issues.filter(
    (issue) => issue.workspaceId === demoState.activeWorkspaceId,
  );
  const workspaceProjects = demoState.projects.filter(
    (project) => project.workspaceId === demoState.activeWorkspaceId && !project.archivedAt,
  );
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - Number(reportRange));
  const reportIssues = workspaceIssues.filter((issue) => new Date(issue.updatedAt) >= rangeStart);
  const closedSprints = demoState.sprints
    .filter(
      (sprint) => sprint.workspaceId === demoState.activeWorkspaceId && sprint.status === "Closed",
    )
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(-8);
  const sprintVelocity = closedSprints.map((sprint) => ({
    sprint,
    points: workspaceIssues
      .filter((issue) => issue.sprintId === sprint.id && issue.status === "Done")
      .reduce((sum, issue) => sum + issue.storyPoints, 0),
  }));
  const averageVelocity = sprintVelocity.length
    ? Math.round(sprintVelocity.reduce((sum, item) => sum + item.points, 0) / sprintVelocity.length)
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
        demoState.members.find((member) => member.id === issue.assigneeId)?.name ?? "",
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
  const addCalendarEvent = (date: string | null, title: string) => {
    if (!date) return;
    calendarEvents.set(date, [...(calendarEvents.get(date) ?? []), title]);
  };
  demoState.issues
    .filter((issue) => issue.workspaceId === demoState.activeWorkspaceId)
    .forEach((issue) => addCalendarEvent(issue.dueDate, `${issue.key} · ${issue.title}`));
  demoState.sprints
    .filter((sprint) => sprint.workspaceId === demoState.activeWorkspaceId)
    .forEach((sprint) => addCalendarEvent(sprint.startDate, `${sprint.name} starts`));
  async function copyDiagnostics() {
    try {
      await navigator.clipboard.writeText(
        `Temora frontend preview\nPath: ${window.location.pathname}\nWorkspace: ${demoState.activeWorkspaceId}\nIssue: ${window.location.pathname.includes("issues/") ? window.location.pathname.split("/").at(-1) : "n/a"}`,
      );
      setNotice("Page diagnostics copied to the clipboard.");
    } catch {
      setNotice("Clipboard access is unavailable. Copy the current page address manually.");
    }
  }
  if (kind === "projects") return <ProjectsDirectory />;
  if (kind === "inbox") return <InboxPage />;
  if (kind === "members") return <MembersDirectory />;
  if (kind === "billing") return <BillingPage />;
  if (kind === "settings") return <WorkspaceSettingsPage />;
  if (["roles", "automation", "audit"].includes(kind)) {
    return <AdvancedPage kind={kind as AdvancedPageKind} />;
  }

  if (kind === "reports")
    return (
      <div className={shell}>
        <PageHeader
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
        {notice && <p className="text-sm text-accent">{notice}</p>}
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
                  onChange={(e) => setPeriod(e.target.value)}
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
              {statusRows.map(([name, val, color]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{name}</span>
                    <strong>
                      {val} ·{" "}
                      {reportIssues.length ? Math.round((val / reportIssues.length) * 100) : 0}%
                    </strong>
                  </div>
                  <div className="h-2 rounded-full bg-surface-high">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${reportIssues.length ? Math.round((val / reportIssues.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="xl:col-span-2">
            <PanelTitle title="Project health" />
            <Table
              headings={["Project", "Completion", "Open issues", "Health", "Lead"]}
              rows={workspaceProjects.map((project) => {
                const projectIssues = workspaceIssues.filter(
                  (issue) => issue.projectId === project.id,
                );
                const openCount = projectIssues.filter((issue) => issue.status !== "Done").length;
                return [
                  project.name,
                  <span className="font-mono" key="c">
                    {project.progress}%
                  </span>,
                  openCount,
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${project.status === "In Progress" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                    key="health"
                  >
                    {project.status}
                  </span>,
                  demoState.members.find((member) => member.id === project.leadId)?.name ??
                    "Unassigned",
                ];
              })}
            />
          </Panel>
        </div>
      </div>
    );

  if (kind === "integrations")
    return (
      <div className={shell}>
        <PageHeader
          title="Integrations & Developer Webhooks"
          subtitle="Connect the tools your team uses and manage API credentials and event delivery."
          action={
            <button
              className={button}
              disabled
              title="API key generation is not connected in this frontend demo."
            >
              <Icon name="key" />
              API keys unavailable
            </button>
          }
        />
        {notice && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Integration buttons below only change a local preview state. No external accounts, API
          keys, or webhooks are created.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Connected integrations"
            value={String(simulatedConnections.length)}
            note="Local preview only"
            icon="extension"
          />
          <MetricCard
            label="Webhooks"
            value="0"
            note="No webhooks configured"
            icon="webhook"
            tone="green"
          />
          <MetricCard label="API requests" value="0" note="No service connected" icon="sync_alt" />
          <MetricCard label="API keys" value="0" note="Key generation disabled" icon="vpn_key" />
        </div>
        <Panel>
          <PanelTitle
            title="App Marketplace"
            trailing={
              <input
                className={field}
                placeholder="Search integrations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Slack", "Chat & notifications", "S", "bg-purple-100 text-purple-700"],
              ["GitHub", "Development", "GH", "bg-slate-900 text-white"],
              ["Figma", "Design", "F", "bg-pink-100 text-pink-700"],
              ["Linear", "Project management", "L", "bg-violet-100 text-violet-700"],
              ["Google Drive", "File sharing", "D", "bg-blue-100 text-blue-700"],
              ["Jira", "Project management", "J", "bg-sky-100 text-sky-700"],
            ]
              .filter((x) => x[0].toLowerCase().includes(query.toLowerCase()))
              .map((x) => (
                <div
                  key={x[0]}
                  className="flex items-center gap-3 rounded-xl border border-border p-4"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-lg text-sm font-bold ${x[3]}`}
                  >
                    {x[2]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block">{x[0]}</strong>
                    <span className="text-xs text-muted">{x[1]}</span>
                  </span>
                  <button
                    className={softButton}
                    onClick={() => {
                      const connected = simulatedConnections.includes(x[0]);
                      setSimulatedConnections((current) =>
                        connected ? current.filter((name) => name !== x[0]) : [...current, x[0]],
                      );
                      setNotice(
                        `${x[0]} is ${connected ? "disconnected" : "marked connected"} in this local preview only.`,
                      );
                    }}
                  >
                    {simulatedConnections.includes(x[0]) ? "Disconnect demo" : "Simulate connect"}
                  </button>
                </div>
              ))}
          </div>
        </Panel>
        <Panel>
          <PanelTitle title="API keys & webhooks" />
          <Table
            headings={["Name", "Created", "Last used", "Status", ""]}
            rows={[
              [
                "Production API",
                "Sep 12, 2024",
                "2 minutes ago",
                "Active",
                <button
                  key="r1"
                  disabled
                  title="No real API credentials are present in this demo."
                  className="text-muted"
                >
                  Unavailable
                </button>,
              ],
              [
                "CI Pipeline",
                "Aug 04, 2024",
                "1 hour ago",
                "Active",
                <button
                  key="r2"
                  disabled
                  title="No real API credentials are present in this demo."
                  className="text-muted"
                >
                  Unavailable
                </button>,
              ],
              [
                "Analytics Read-only",
                "Jun 18, 2024",
                "Oct 20, 2024",
                "Expiring",
                <button
                  key="r3"
                  disabled
                  title="No real API credentials are present in this demo."
                  className="text-muted"
                >
                  Unavailable
                </button>,
              ],
            ]}
          />
        </Panel>
      </div>
    );

  if (kind === "calendar")
    return (
      <div className={shell}>
        <PageHeader
          title="Planning Calendar"
          subtitle="See sprint cycles, project milestones, and task due dates across your workspace."
          action={
            <Link className={button} href="/issues/new">
              <Icon name="add" />
              New Issue / Deadline
            </Link>
          }
        />
        {notice && <p className="text-sm text-accent">{notice}</p>}
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className={softButton}
                aria-label="Previous month"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                  )
                }
              >
                ‹
              </button>
              <h2 className="min-w-36 text-center text-lg font-semibold">
                {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <button
                className={softButton}
                aria-label="Next month"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                  )
                }
              >
                ›
              </button>
              <button
                className={softButton}
                onClick={() =>
                  setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                }
              >
                Today
              </button>
            </div>
            <div className="flex gap-1 rounded-lg bg-surface-low p-1">
              {["Month", "Week", "Day"].map((v) => (
                <button
                  key={v}
                  onClick={() => setPeriod(v)}
                  className={`rounded-md px-3 py-1.5 text-sm ${period === v ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 border-l border-t border-border text-center text-xs text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div className="border-b border-r border-border py-2 font-semibold" key={d}>
                {d}
              </div>
            ))}
            {Array.from({ length: 42 }, (_, i) => {
              const date = new Date(
                calendarGridStart.getFullYear(),
                calendarGridStart.getMonth(),
                calendarGridStart.getDate() + i,
              );
              const inMonth = date.getMonth() === calendarMonth.getMonth();
              const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const events = calendarEvents.get(dateKey) ?? [];
              return (
                <div
                  key={dateKey}
                  className={`min-h-24 border-b border-r border-border p-2 text-left ${inMonth ? "bg-white" : "bg-surface-low/60 text-outline"}`}
                >
                  <span
                    className={`text-xs ${date.toDateString() === new Date().toDateString() ? "grid size-6 place-items-center rounded-full bg-accent text-white" : ""}`}
                  >
                    {date.getDate()}
                  </span>
                  {events.slice(0, 2).map((event, index) => (
                    <Link
                      key={`${event}-${index}`}
                      href={
                        event.split(" · ")[0].startsWith("TEM-")
                          ? `/issues/${event.split(" · ")[0]}`
                          : "/projects"
                      }
                      className={`mt-2 block truncate rounded px-1.5 py-1 text-[10px] font-medium ${index === 0 ? "bg-accent/10 text-accent" : "bg-emerald-50 text-emerald-800"}`}
                    >
                      {event}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    );

  const notFound = kind === "not-found";
  return (
    <div className={shell}>
      <Panel className="mx-auto max-w-3xl py-12 text-center sm:py-16">
        <span
          className={`mx-auto grid size-16 place-items-center rounded-2xl ${notFound ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
        >
          <Icon name={notFound ? "search_off" : "gpp_bad"} size={32} />
        </span>
        <p className="mt-6 font-mono text-xs font-semibold tracking-widest text-outline">
          {notFound ? "HTTP 404 // RESOURCE_NOT_FOUND" : "403 // INSUFFICIENT_PRIVILEGES"}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {notFound ? "We couldn’t find that page" : "You don’t have access to this page"}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
          {notFound
            ? "The requested issue or resource may have moved, been archived, or no longer exists."
            : "This is a permission-state preview. No authorization service enforces roles or receives access requests."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link className={button} href="/">
            Return to overview
          </Link>
          <button
            className={softButton}
            disabled={!notFound}
            title={
              notFound
                ? "Copy diagnostic context"
                : "Access requests are not connected in this preview"
            }
            onClick={copyDiagnostics}
          >
            {notFound ? "Copy diagnostics" : "Access request unavailable"}
          </button>
        </div>
        {notice && (
          <p role="status" className="mt-4 text-sm text-accent">
            {notice}
          </p>
        )}
        <p className="mt-8 font-mono text-[11px] text-outline">
          {notFound
            ? "TENANT: LOCAL DEMO · TRACE: UNAVAILABLE"
            : "AUTHORIZATION SERVICE: NOT CONNECTED · PREVIEW ONLY"}
        </p>
      </Panel>
    </div>
  );
}
