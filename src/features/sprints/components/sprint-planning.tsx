"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { PriorityPill, StatusPill } from "@/components/shared/dashboard-ui";
import { tasks } from "@/features/workspace/data/fixtures";

const sprintRows = [
  {
    key: "TEM-101",
    title: "Re-architect global CSS tokens with Tailwind theme spec",
    epic: "Design System",
    points: 5,
    priority: "Urgent" as const,
    status: "In Progress" as const,
    owner: "Alex M.",
  },
  {
    key: "TEM-103",
    title: "Fix Safari 17 layout shift on responsive sticky header",
    epic: "Marketing Web",
    points: 3,
    priority: "High" as const,
    status: "In Review" as const,
    owner: "Sarah C.",
  },
  {
    key: "TEM-108",
    title: "Configure Edge CDN caching rules for marketing hero assets",
    epic: "Infrastructure",
    points: 2,
    priority: "Medium" as const,
    status: "To Do" as const,
    owner: "Daniel K.",
  },
  {
    key: "TEM-112",
    title: "Deploy redesigned hero section animation micro-interactions",
    epic: "Marketing Web",
    points: 8,
    priority: "High" as const,
    status: "Done" as const,
    owner: "Alex M.",
  },
];

function Burndown() {
  const [showChart, setShowChart] = useState(true);
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
            <Icon name="stacked_line_chart" />
          </span>
          <h2 className="font-semibold">Sprint 14 Burndown Velocity</h2>
        </div>
        <button
          onClick={() => setShowChart(!showChart)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-low"
        >
          {showChart ? "Hide chart" : "Show chart"}
        </button>
      </div>
      {showChart && (
        <>
          <svg
            viewBox="0 0 900 190"
            className="mt-4 h-40 w-full"
            role="img"
            aria-label="Sprint burndown: ideal versus actual"
          >
            <defs>
              <linearGradient id="sprint-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#635bff" stopOpacity=".14" />
                <stop offset="1" stopColor="#635bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M55 25 L840 160 L840 175 L55 175 Z" fill="url(#sprint-area)" />
            <path
              d="M55 25 L840 160"
              fill="none"
              stroke="#a5a2bb"
              strokeDasharray="7 6"
              strokeWidth="2"
            />
            <path
              d="M55 25 L180 48 L305 70 L430 80 L555 104 L680 120 L840 160"
              fill="none"
              stroke="#635bff"
              strokeWidth="3"
            />
            <path
              d="M0 175 H880 M0 130 H880 M0 85 H880 M0 40 H880"
              stroke="#ececf5"
              strokeWidth="1"
            />
            <circle cx="555" cy="104" r="6" fill="#635bff" />
          </svg>
          <div className="flex justify-between font-mono text-[10px] text-outline">
            <span>Day 1</span>
            <span>Day 4</span>
            <span>Day 7</span>
            <span className="font-semibold text-accent">Day 10 (Oct 24)</span>
            <span>Day 14 (Oct 28)</span>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted">
            <span>
              <i className="mr-1 inline-block w-4 border-t border-dashed border-outline" />
              Ideal Burn
            </span>
            <span>
              <i className="mr-1 inline-block w-4 border-t-2 border-accent" />
              Actual Remaining
            </span>
            <span className="font-semibold text-accent">Today (14 pts left)</span>
          </div>
        </>
      )}
    </Panel>
  );
}

function SprintIssueTable({
  title,
  goal,
  range,
  planned = false,
}: {
  title: string;
  goal: string;
  range: string;
  planned?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const rows = planned
    ? [tasks[5], tasks[3], tasks[6]].map((task) => ({
        ...task,
        epic: task.project,
        owner: `${task.assignee.split(" ")[0]} ${task.assignee.split(" ")[1]?.[0] ?? ""}.`,
      }))
    : sprintRows;
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-white px-4 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left"
        >
          <Icon
            name={collapsed ? "chevron_right" : "expand_more"}
            size={19}
            className="text-muted"
          />
          <span className="font-semibold">{title}</span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-[10px] ${planned ? "bg-surface-high text-muted" : "bg-emerald-100 text-green"}`}
          >
            {planned ? "Planned / Next" : "Active Sprint"}
          </span>
        </button>
        <span className="font-mono text-xs text-muted">{range}</span>
      </header>
      {!collapsed && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-low px-4 py-2 text-xs">
            <span>
              <span className="font-semibold">Sprint Goal:</span> {goal}
            </span>
            <span className="font-mono text-accent">
              {planned ? "38 / 45 SP Capacity (84%)" : "14 SP Remaining / 42 Done"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[780px]">
              <div className="grid grid-cols-[105px_minmax(270px,1fr)_135px_72px_100px_95px_100px] gap-3 border-b border-surface-low px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-outline">
                <span>Issue Key</span>
                <span>Title</span>
                <span>Epic / Category</span>
                <span>Estimate</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Assignee</span>
              </div>
              {rows.map((task) => (
                <div
                  key={task.key}
                  className="grid grid-cols-[105px_minmax(270px,1fr)_135px_72px_100px_95px_100px] items-center gap-3 border-b border-surface-low px-4 py-3 text-xs hover:bg-surface-low/70"
                >
                  <span className="font-mono font-semibold text-accent">{task.key}</span>
                  <span className="font-medium">{task.title}</span>
                  <span className="truncate text-muted">{task.epic}</span>
                  <span>{task.points} pts</span>
                  <PriorityPill priority={task.priority} />
                  <StatusPill status={planned ? "Planned" : task.status} />
                  <span className="truncate text-muted">{task.owner}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="m-3 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/5">
            <Icon name="add_circle" size={16} />
            Add issue to {title}
          </button>
        </>
      )}
    </section>
  );
}

export function SprintPlanning() {
  const [query, setQuery] = useState("");
  const backlog = tasks.filter(
    (task) =>
      !["TEM-101", "TEM-103", "TEM-108"].includes(task.key) &&
      `${task.key} ${task.title}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-[1540px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Website Redesign</span>
            <span>/</span>
            <span className="font-semibold text-foreground">WR-2024</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-green">
              Sprint 14 Active
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Sprint Planning &amp; Backlog</h1>
        </div>
        <div className="flex gap-2">
          <button className="h-9 rounded-lg border border-border px-3 text-sm">
            Sprint Settings
          </button>
          <button className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
            Complete Sprint
          </button>
        </div>
      </div>
      <nav className="flex gap-5 border-b border-border/50 text-sm">
        {["Overview", "Board", "Sprints & Backlog", "List", "Calendar", "Files", "Settings"].map(
          (tab) => (
            <a
              key={tab}
              href={tab === "Board" ? "/projects/website-redesign/board" : "#sprints"}
              className={`border-b-2 py-2 ${tab === "Sprints & Backlog" ? "border-accent font-semibold text-accent" : "border-transparent text-muted"}`}
            >
              {tab}
            </a>
          ),
        )}
      </nav>
      <Panel className="bg-accent text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/70">
              Sprint 14 <span className="rounded-full bg-white/20 px-2 py-0.5">Active</span>
            </div>
            <h2 className="mt-1 text-xl font-semibold">
              Ends in 4 days{" "}
              <span className="font-mono text-sm font-normal text-white/70">(Oct 28)</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Goal: Flagship marketing rebrand, responsive grid overhaul, and design token migration
              across all web targets.
            </p>
          </div>
          <Icon name="cycle" size={34} className="text-white/70" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Points Done", "75% · 42 / 56 pts", "check_circle"],
            ["Total Issues", "18 tasks · 13 Done", "task_alt"],
            ["Team Capacity", "88% · 6 members", "group"],
          ].map(([label, value, icon]) => (
            <div className="rounded-xl bg-white/10 p-3" key={label}>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Icon name={icon} size={17} />
                {label}
              </div>
              <div className="mt-2 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Burndown />
      <div id="sprints" className="space-y-4">
        <SprintIssueTable
          title="Sprint 14"
          goal="Flagship marketing rebrand & responsive grid"
          range="Oct 14 – Oct 28"
        />
        <SprintIssueTable
          title="Sprint 15"
          goal="Customer dashboard API integration & billing checkout flows"
          range="Oct 29 – Nov 12"
          planned
        />
      </div>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Product Backlog{" "}
              <span className="ml-1 rounded-full bg-surface-high px-2 font-mono text-xs">
                24 Issues
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted">64 Story Points Total</p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search backlog"
              className="h-9 rounded-lg border border-border px-3 text-sm outline-none focus:border-accent"
            />
            <button className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
              Create Sprint
            </button>
          </div>
        </div>
        <div className="mt-3 divide-y divide-surface-low">
          {backlog.map((task) => (
            <div key={task.key} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-mono text-xs font-semibold text-accent">{task.key}</span>
              <span className="min-w-48 flex-1">{task.title}</span>
              <span className="text-xs text-muted">{task.points} SP</span>
              <PriorityPill priority={task.priority} />
              <span className="text-xs text-muted">{task.assignee}</span>
              <button
                aria-label={`Add ${task.key} to sprint`}
                className="rounded p-1 text-accent hover:bg-accent/10"
              >
                <Icon name="add_circle" size={17} />
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
