import { Icon } from "@/components/shared/icon";
import Link from "next/link";
import {
  MetricCard,
  Panel,
  PanelTitle,
  PriorityPill,
  StatusPill,
} from "@/components/shared/dashboard-ui";
import { projects, tasks } from "@/features/workspace/data/fixtures";

function BurndownChart() {
  return (
    <div className="mt-3 rounded-xl border border-surface-container p-3">
      <div className="flex justify-between text-sm text-muted">
        <span>Burndown Velocity</span>
        <strong className="font-mono text-foreground">42 / 56 SP (75%)</strong>
      </div>
      <svg
        viewBox="0 0 420 130"
        className="mt-3 h-28 w-full"
        role="img"
        aria-label="Sprint burndown trend"
      >
        <defs>
          <linearGradient id="burndown-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#635bff" stopOpacity=".2" />
            <stop offset="1" stopColor="#635bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M20 24 L110 42 L200 61 L288 68 L375 98 L400 108 L400 118 L20 118 Z"
          fill="url(#burndown-fill)"
        />
        <path
          d="M20 24 L110 42 L200 61 L288 68 L375 98 L400 108"
          fill="none"
          stroke="#635bff"
          strokeWidth="3"
        />
        <path
          d="M20 24 L400 108"
          fill="none"
          stroke="#bbb9d0"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <circle cx="330" cy="83" r="6" fill="#635bff" />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-outline">
        <span>Day 1 (56 SP)</span>
        <span className="font-semibold text-accent">Today: Day 10 (14 SP left)</span>
        <span>Day 14 (0 SP)</span>
      </div>
    </div>
  );
}

function PriorityTasks() {
  return (
    <Panel>
      <PanelTitle
        icon={<Icon name="checklist" />}
        title="My Priority Tasks"
        trailing={
          <span className="rounded-full bg-surface-high px-2.5 py-1 font-mono text-xs">3</span>
        }
      />
      <div className="divide-y divide-surface-low">
        {tasks.slice(0, 3).map((task) => (
          <div key={task.key} className="flex items-center gap-3 py-4">
            <button
              aria-label={`Mark ${task.key} complete`}
              className="size-4 shrink-0 rounded border border-border bg-surface-low hover:border-accent"
            />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs font-semibold text-accent">
                {task.key}
                <span className="text-outline"> · </span>
                <span className="font-sans font-normal text-muted">{task.project}</span>
              </div>
              <div className="truncate text-sm font-medium">{task.title}</div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <PriorityPill priority={task.priority} />
              <span className="rounded-md bg-surface-low px-2 py-1 font-mono text-[11px] text-muted">
                {task.due}
              </span>
              <StatusPill status={task.status} />
              <span className="grid size-7 place-items-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                {task.assignee
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-outline">
        <span>Press ⌘+T to add task to personal queue</span>
        <Link href="/my-tasks" className="font-semibold text-accent hover:underline">
          View all 14 assigned →
        </Link>
      </div>
    </Panel>
  );
}

function ProjectProgress() {
  return (
    <Panel>
      <PanelTitle
        title="Active Projects Progress"
        trailing={
          <button
            aria-label="More project options"
            className="rounded p-1 text-muted hover:bg-surface-low"
          >
            <Icon name="more_horiz" />
          </button>
        }
      />
      <p className="-mt-3 mb-4 text-sm text-muted">Cross-team milestones and delivery schedules</p>
      <div className="space-y-3">
        {projects.map((project) => (
          <article key={project.name} className="rounded-xl bg-surface-low p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${project.color}`} />
                <h3 className="font-semibold">{project.name}</h3>
                <span className="rounded bg-surface-high px-2 py-0.5 font-mono text-[10px] text-muted">
                  {project.category}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold">
                {project.percent}%{" "}
                <span className="font-normal text-outline">Due {project.due}</span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${project.color}`}
                style={{ width: `${project.percent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>
                <span className="font-mono text-outline">Lead:</span> {project.lead}
              </span>
              <span>
                {project.open} open tasks <span className="text-green">• On schedule</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Workload() {
  const members = [
    { name: "Alex Morgan", tasks: 8, capacity: 95, color: "bg-red" },
    { name: "Sarah Chen", tasks: 6, capacity: 75, color: "bg-green" },
    { name: "Daniel Kim", tasks: 5, capacity: 60, color: "bg-accent" },
    { name: "Emily Carter", tasks: 7, capacity: 85, color: "bg-accent" },
  ];
  return (
    <Panel>
      <PanelTitle
        title="Team Workload"
        trailing={<span className="font-mono text-xs text-outline">Sprint 14 capacity</span>}
      />
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{member.name}</span>
              <span
                className={`font-mono text-xs font-semibold ${member.capacity > 90 ? "text-red" : member.color === "bg-green" ? "text-green" : "text-accent"}`}
              >
                {member.tasks} tasks • {member.capacity}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${member.color}`}
                style={{ width: `${member.capacity}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentActivity() {
  const activity = [
    "Sarah Chen moved TEM-103 to In Review",
    "Daniel Kim commented on TEM-104: ‘PR is ready for review’",
    "Emily Carter created new task TEM-108",
    "Alex Morgan closed TEM-99",
  ];
  return (
    <Panel>
      <PanelTitle
        icon={<Icon name="history" />}
        title="Recent Activity"
        trailing={<span className="font-mono text-xs font-semibold text-accent">Stream</span>}
      />
      <ol className="ml-2 space-y-4 border-l-2 border-surface-high pl-4">
        {activity.map((item, index) => (
          <li className="relative text-sm leading-5" key={item}>
            <span
              className={`absolute -left-[22px] top-1 size-3 rounded-full ring-4 ring-white ${index === 1 ? "bg-accent" : "bg-surface-high"}`}
            />
            {item}
            <span className="mt-1 block font-mono text-[10px] text-outline">
              {["12m", "34m", "1h", "2h"][index]} ago
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function WorkspaceOverview() {
  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            Northstar Studio • Live Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Good morning, Alex</h1>
          <p className="mt-1 text-sm text-muted">
            Here is what&apos;s happening across Northstar Studio today •{" "}
            <strong className="font-medium text-foreground">Wednesday, Oct 24</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-surface-high p-0.5 text-sm">
            <button className="rounded-md bg-white px-3 py-1.5 font-medium shadow-sm">
              My Focus
            </button>
            <button className="rounded-md px-3 py-1.5 text-muted">All Teams</button>
          </div>
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm shadow-sm hover:bg-surface-high">
            <Icon name="folder_special" size={16} />
            Create Project
          </button>
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong">
            <Icon name="add" size={17} />
            New Issue
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Projects" value="4 active" note="↑ +1 m/m" icon="folder_open" />
        <MetricCard label="Open Tasks" value="38 tasks" note="12 due week" icon="task_alt" />
        <MetricCard label="Sprint Velocity" value="92%" note="Sprint 14" icon="bolt" tone="green" />
        <MetricCard
          label="Overdue Issues"
          value="2 urgent"
          note="Action Req."
          icon="warning"
          tone="red"
        />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <PriorityTasks />
          <ProjectProgress />
        </div>
        <div className="space-y-5 xl:col-span-5">
          <Panel>
            <PanelTitle
              icon={<Icon name="cycle" />}
              title="Sprint 14 Health"
              trailing={
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-semibold text-green">
                  4 days left
                </span>
              }
            />
            <div className="rounded-lg bg-surface-low p-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-outline">
                Sprint Goal
              </span>
              <p className="mt-1 text-sm font-medium">
                Auth refactor &amp; high-priority client onboarding
              </p>
            </div>
            <BurndownChart />
          </Panel>
          <Workload />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
