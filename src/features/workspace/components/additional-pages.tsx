"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { MetricCard, Panel, PanelTitle } from "@/components/shared/dashboard-ui";
import { AdvancedPage, type AdvancedPageKind } from "@/features/workspace/components/advanced-pages";
import { ProjectsDirectory } from "@/features/projects/components/projects-directory";

type PageKind =
  | "projects"
  | "billing"
  | "issue"
  | "members"
  | "inbox"
  | "integrations"
  | "reports"
  | "calendar"
  | "settings"
  | "empty"
  | "not-found"
  | "forbidden"
  | "create-issue"
  | "issues"
  | "dependencies"
  | "burndown"
  | "complete-sprint"
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

const members = [
  ["SC", "Sarah Chen", "sarah@northstar.studio", "Product Design", "Admin", "Online"],
  ["JL", "Jordan Lee", "jordan@northstar.studio", "Engineering", "Member", "Online"],
  ["MP", "Maya Patel", "maya@northstar.studio", "Product Design", "Member", "Away"],
  ["AM", "Alex Morgan", "alex@northstar.studio", "Leadership", "Owner", "Online"],
  ["TK", "Theo Kim", "theo@northstar.studio", "Engineering", "Member", "Offline"],
];
const projects = [
  ["Website Redesign", "WR", "Product Design", "In Progress", "72%", "bg-violet-500"],
  ["Mobile Application", "MA", "Mobile Engineering", "In Progress", "48%", "bg-emerald-500"],
  ["Customer Portal", "CP", "Platform", "Planning", "24%", "bg-sky-500"],
  ["Design System", "DS", "Product Design", "In Review", "86%", "bg-amber-500"],
];
const activities = [
  ["Sarah Chen", "mentioned you in", "Homepage hero exploration", "12m ago", "@"],
  ["Jordan Lee", "completed", "API contract for user profile", "48m ago", "✓"],
  ["Maya Patel", "commented on", "Mobile navigation prototype", "2h ago", "“"],
  ["Sprint 14", "started today", "Website Redesign", "4h ago", "↗"],
  ["Theo Kim", "assigned you", "Review responsive breakpoints", "Yesterday", "＋"],
];

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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [read, setRead] = useState<number[]>([]);
  const [tab, setTab] = useState("General");
  const [period, setPeriod] = useState("Month");
  const [notice, setNotice] = useState("");
  const shownMembers = useMemo(
    () =>
      members.filter(
        (row) =>
          row.join(" ").toLowerCase().includes(query.toLowerCase()) &&
          (filter === "All" || row[4] === filter),
      ),
    [query, filter],
  );

  if (kind === "projects") return <ProjectsDirectory />;
  if (
    [
      "create-issue",
      "issues",
      "dependencies",
      "burndown",
      "complete-sprint",
      "roles",
      "retrospective",
      "automation",
      "audit",
    ].includes(kind)
  ) {
    return <AdvancedPage kind={kind as AdvancedPageKind} />;
  }

  if (kind === "issue")
    return (
      <div className={shell}>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link href="/projects/website-redesign/board" className="hover:text-accent">
            ← Website Redesign
          </Link>
          <span>/</span>
          <span>TEM-101</span>
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Panel>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-accent/10 px-2 py-1 font-mono font-semibold text-accent">
                  STORY · TEM-101
                </span>
                <span className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
                  In Progress
                </span>
                <span className="rounded bg-red-100 px-2 py-1 font-semibold text-red-700">
                  Urgent
                </span>
                <button className="ml-auto text-muted" aria-label="More issue actions">
                  <Icon name="more_horiz" />
                </button>
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">
                Design the homepage responsive grid & hero layout
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                <span>Updated 22m ago</span>
                <span>·</span>
                <span>Sprint 14</span>
                <button className="text-accent" onClick={() => setNotice("Issue link copied.")}>
                  Share link
                </button>
                <Link className="text-accent" href="/issues/TEM-101/dependencies">
                  Dependencies & history
                </Link>
              </div>
              <p className="mt-6 leading-7 text-muted">
                Create a flexible homepage layout that adapts across desktop, tablet, and mobile
                breakpoints. The hero section should keep the primary call to action visible and
                preserve the visual hierarchy.
              </p>
              <h2 className="mt-6 font-semibold">Acceptance criteria</h2>
              <div className="mt-3 space-y-2">
                {[
                  "Responsive grid supports desktop, tablet, and mobile widths",
                  "Hero content and primary action remain clear at every breakpoint",
                  "Design reviewed against the component library",
                ].map((x) => (
                  <label key={x} className="flex gap-3 rounded-lg bg-surface-low p-3 text-sm">
                    <input type="checkbox" className="accent-violet-600" />
                    {x}
                  </label>
                ))}
              </div>
            </Panel>
            <Panel>
              <PanelTitle title="Activity" />
              <textarea
                className="min-h-24 w-full rounded-lg border border-border p-3 text-sm outline-none focus:border-accent"
                placeholder="Write a comment…"
              />
              <div className="mt-2 flex justify-end">
                <button
                  className={button}
                  onClick={() => setNotice("Comment added to this local preview.")}
                >
                  Comment
                </button>
              </div>
              {notice && <p className="mt-2 text-sm text-accent">{notice}</p>}
              <div className="mt-5 space-y-4 border-t border-border pt-4">
                <p className="text-sm">
                  <strong>Sarah Chen</strong> <span className="text-xs text-muted">· 12m ago</span>
                  <span className="mt-1 block text-muted">
                    I’ve updated the hero exploration. Can you check the tablet breakpoint?
                  </span>
                </p>
                <p className="text-sm">
                  <strong>Alex Morgan</strong>{" "}
                  <span className="text-xs text-muted">· Yesterday</span>
                  <span className="mt-1 block text-muted">
                    Added initial responsive layout notes.
                  </span>
                </p>
              </div>
            </Panel>
          </div>
          <Panel className="h-fit">
            <PanelTitle title="Details" />
            <div className="space-y-4 text-sm">
              {[
                ["Assignee", "Sarah Chen"],
                ["Reporter", "Alex Morgan"],
                ["Priority", "Urgent"],
                ["Status", "In Progress"],
                ["Sprint", "Sprint 14"],
                ["Estimate", "5 points"],
                ["Due date", "Oct 28, 2024"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-muted">{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-semibold">Labels</h3>
              <span className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-800">
                Design System
              </span>
              <span className="ml-2 rounded bg-sky-100 px-2 py-1 text-xs text-sky-800">
                Frontend
              </span>
            </div>
          </Panel>
        </div>
      </div>
    );

  if (kind === "reports")
    return (
      <div className={shell}>
        <PageHeader
          title="Reports & Analytics"
          subtitle="Understand team delivery, sprint velocity, and project health."
          action={
            <div className="flex gap-2">
              <select className={field}>
                <option>Last 30 Days: Oct 1 – Oct 31, 2024</option>
                <option>Last 90 Days</option>
                <option>This year</option>
              </select>
              <button className={softButton} onClick={() => setNotice("Report export prepared.")}>
                <Icon name="file_download" />
                Export
              </button>
            </div>
          }
        />
        {notice && <p className="text-sm text-accent">{notice}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Issues completed"
            value="128"
            note="↑ 12.8%"
            icon="task_alt"
            tone="green"
          />
          <MetricCard
            label="Cycle time"
            value="3.4 days"
            note="↓ 8.2%"
            icon="avg_time"
            tone="green"
          />
          <MetricCard label="Sprint velocity" value="42 pts" note="↑ 5.1%" icon="speed" />
          <MetricCard label="On-time delivery" value="91%" note="↑ 3.4%" icon="flag" tone="green" />
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
              {[52, 68, 61, 78, 72, 91, 82, 96].map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t-md bg-accent/80" style={{ height: `${h}%` }} />
                  <span className="mt-2 text-center text-[10px] text-muted">S{i + 7}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-5 text-xs text-muted">
              <span>■ Completed</span>
              <span>— Average 38 pts</span>
            </div>
          </Panel>
          <Panel>
            <PanelTitle title="Issues by status" />
            <div className="space-y-5 py-3">
              {[
                ["Done", 78, "bg-emerald-500"],
                ["In Progress", 54, "bg-violet-500"],
                ["In Review", 34, "bg-amber-400"],
                ["To Do", 24, "bg-slate-300"],
              ].map(([name, val, color]) => (
                <div key={name as string}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{name}</span>
                    <strong>{val}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-surface-high">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="xl:col-span-2">
            <PanelTitle title="Project health" />
            <Table
              headings={["Project", "Completion", "Open issues", "Health", "Lead"]}
              rows={projects.map((p, i) => [
                p[0],
                <span className="font-mono" key="c">
                  {p[4]}
                </span>,
                [18, 24, 11, 6][i],
                <span
                  className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
                  key="health"
                >
                  On track
                </span>,
                members[i][1],
              ])}
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
              onClick={() => setNotice("API key created in this local preview.")}
            >
              <Icon name="key" />
              Generate API Key
            </button>
          }
        />
        {notice && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Connected integrations"
            value="24"
            note="Across 5 categories"
            icon="extension"
          />
          <MetricCard
            label="Webhooks"
            value="5"
            note="All operational"
            icon="webhook"
            tone="green"
          />
          <MetricCard label="API requests (24h)" value="142.8k" note="↑ 12.4%" icon="sync_alt" />
          <MetricCard label="API keys" value="3" note="1 expires soon" icon="vpn_key" tone="red" />
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
                    onClick={() => setNotice(`${x[0]} connection settings opened.`)}
                  >
                    Manage
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
                <button key="r1" className="text-red-600">
                  Revoke
                </button>,
              ],
              [
                "CI Pipeline",
                "Aug 04, 2024",
                "1 hour ago",
                "Active",
                <button key="r2" className="text-red-600">
                  Revoke
                </button>,
              ],
              [
                "Analytics Read-only",
                "Jun 18, 2024",
                "Oct 20, 2024",
                "Expiring",
                <button key="r3" className="text-red-600">
                  Revoke
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
            <button className={button} onClick={() => setNotice("New event form opened.")}>
              <Icon name="add" />
              New Event / Deadline
            </button>
          }
        />
        {notice && <p className="text-sm text-accent">{notice}</p>}
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button className={softButton} aria-label="Previous month">
                ‹
              </button>
              <h2 className="min-w-36 text-center text-lg font-semibold">October 2024</h2>
              <button className={softButton} aria-label="Next month">
                ›
              </button>
              <button className={softButton}>Today</button>
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
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 1;
              const inMonth = day > 0 && day <= 31;
              return (
                <div
                  key={i}
                  className={`min-h-24 border-b border-r border-border p-2 text-left ${inMonth ? "bg-white" : "bg-surface-low/60 text-outline"}`}
                >
                  <span
                    className={`text-xs ${day === 17 ? "grid size-6 place-items-center rounded-full bg-accent text-white" : ""}`}
                  >
                    {day <= 0 ? 30 + day : day > 31 ? day - 31 : day}
                  </span>
                  {inMonth && [4, 8, 14, 17, 22, 28].includes(day) && (
                    <div
                      className={`mt-2 truncate rounded px-1.5 py-1 text-[10px] font-medium ${day === 17 ? "bg-accent/10 text-accent" : "bg-emerald-50 text-emerald-800"}`}
                    >
                      {day === 17
                        ? "Sprint 14 review"
                        : day === 22
                          ? "Mobile app milestone"
                          : day === 28
                            ? "TEM-101 due"
                            : "Team planning"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    );

  if (kind === "settings")
    return (
      <div className={shell}>
        <PageHeader
          title="Workspace Settings"
          subtitle="Configure workspace details, workflows, fields, and automation rules."
        />
        <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
          <Panel className="h-fit">
            <nav className="space-y-1">
              {[
                "General",
                "Workflows & Statuses",
                "Custom Fields",
                "Automation Rules",
                "Audit Logs",
                "Billing",
              ].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${tab === t ? "bg-accent/10 font-semibold text-accent" : "text-muted hover:bg-surface-low"}`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </Panel>
          <div className="space-y-5">
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {tab === "General" ? "General settings" : tab}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Manage your workspace {tab.toLowerCase()} and default behavior.
                  </p>
                </div>
                <button className={button} onClick={() => setNotice("Workflow settings saved.")}>
                  <Icon name="save" />
                  Save changes
                </button>
              </div>
              {tab === "Workflows & Statuses" ? (
                <div className="mt-5 space-y-3">
                  {[
                    ["Backlog", "Issues waiting to be planned", "bg-slate-100 text-slate-700"],
                    ["To Do", "Ready for work", "bg-blue-100 text-blue-800"],
                    ["In Progress", "Work currently underway", "bg-violet-100 text-violet-800"],
                    ["In Review", "Awaiting review", "bg-amber-100 text-amber-800"],
                    ["Done", "Completed work", "bg-emerald-100 text-emerald-800"],
                  ].map((s, i) => (
                    <div
                      key={s[0]}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Icon name="drag_indicator" className="text-outline" />
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${s[2]}`}>
                        {s[0]}
                      </span>
                      <span className="flex-1 text-sm text-muted">{s[1]}</span>
                      <button className="text-muted" aria-label={`Edit ${s[0]}`}>
                        <Icon name="edit" />
                      </button>
                      {i > 1 && (
                        <button className="text-muted" aria-label={`Remove ${s[0]}`}>
                          <Icon name="close" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className={softButton}
                    onClick={() => setNotice("Custom status editor opened.")}
                  >
                    <Icon name="add" />
                    Create custom status
                  </button>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Workspace name", "Northstar Studio"],
                    ["Workspace URL", "northstar.temora.app"],
                    ["Default project methodology", "Agile Scrum"],
                    ["Default sprint length", "2 weeks"],
                  ].map(([label, value]) => (
                    <label key={label} className="text-sm font-medium">
                      {label}
                      <input className={`${field} mt-1 w-full`} defaultValue={value} />
                    </label>
                  ))}
                </div>
              )}
              {notice && (
                <p role="status" className="mt-4 text-sm text-emerald-700">
                  {notice}
                </p>
              )}
            </Panel>
            <Panel>
              <PanelTitle title="Danger zone" />
              <p className="text-sm text-muted">Transfer ownership or archive this workspace.</p>
              <button
                className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700"
                onClick={() => setNotice("Workspace archive requires an owner confirmation.")}
              >
                Archive workspace
              </button>
            </Panel>
          </div>
        </div>
      </div>
    );

  if (kind === "empty")
    return (
      <div className={shell}>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link href="/projects" className="hover:text-accent">
            Projects
          </Link>
          <span>/</span>
          <span>Customer Mobile App</span>
        </div>
        <Panel className="mx-auto max-w-3xl py-12 text-center sm:py-16">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Icon name="view_kanban" size={32} />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-accent">
            Customer Mobile App · CMA2
          </p>
          <h1 className="mt-2 text-2xl font-bold">Your project board is ready</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            Bring your team&apos;s work together. Import existing issues or create the first issue to
            start planning your sprint.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className={button} onClick={() => setNotice("Issue composer opened.")}>
              <Icon name="add" />
              Create first issue
            </button>
            <button
              className={softButton}
              onClick={() => setNotice("Issue import is ready for a connected source.")}
            >
              <Icon name="cloud_download" />
              Import issues
            </button>
          </div>
          {notice && (
            <p role="status" className="mt-4 text-sm text-accent">
              {notice}
            </p>
          )}
          <div className="mx-auto mt-9 grid max-w-xl gap-3 border-t border-border pt-6 text-left sm:grid-cols-3">
            {[
              ["01", "Add issues", "Capture work for your team"],
              ["02", "Plan a sprint", "Set a shared goal"],
              ["03", "Track progress", "Move work across your board"],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span className="font-mono text-xs text-accent">{n}</span>
                <strong className="mt-2 block text-sm">{t}</strong>
                <p className="mt-1 text-xs text-muted">{d}</p>
              </div>
            ))}
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
            : "Your current workspace role does not include permission to view this resource. Request access from a workspace administrator."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link className={button} href="/">
            Return to overview
          </Link>
          <button
            className={softButton}
            onClick={() =>
              setNotice(
                notFound ? "Support details copied." : "Access request sent to workspace admins.",
              )
            }
          >
            {notFound ? "Copy diagnostics" : "Request access"}
          </button>
        </div>
        {notice && (
          <p role="status" className="mt-4 text-sm text-accent">
            {notice}
          </p>
        )}
        <p className="mt-8 font-mono text-[11px] text-outline">
          {notFound
            ? "TENANT: NORTHSTAR_PROD · TRACE: TEM-999"
            : "TICKET #SEC-8921 · ENFORCEMENT: STRICT RBAC"}
        </p>
      </Panel>
    </div>
  );
}
