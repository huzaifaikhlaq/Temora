import type { ReactNode } from "react";
import type { Priority, WorkStatus } from "@/features/workspace/data/fixtures";

const statusStyles: Record<WorkStatus, string> = {
  "In Progress": "bg-accent/15 text-accent-strong",
  "In Review": "bg-amber-100 text-amber-800",
  "To Do": "bg-surface-high text-muted",
  Backlog: "bg-surface-high text-muted",
  Done: "bg-emerald-100 text-emerald-800",
  Planned: "bg-surface-high text-muted",
};

const priorityStyles: Record<Priority, string> = {
  Urgent: "bg-red-100 text-red",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-surface-high text-muted",
  Low: "bg-slate-100 text-slate-500",
};

export function StatusPill({ status }: { status: WorkStatus }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${priorityStyles[priority]}`}
    >
      <span aria-hidden="true">
        {priority === "Urgent"
          ? "‼"
          : priority === "High"
            ? "↑"
            : priority === "Medium"
              ? "—"
              : "↓"}
      </span>
      {priority}
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function PanelTitle({
  icon,
  title,
  trailing,
}: {
  icon?: ReactNode;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
        {icon && (
          <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
            {icon}
          </span>
        )}
        {title}
      </h2>
      {trailing}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone?: "accent" | "green" | "red";
}) {
  const color = tone === "green" ? "text-green" : tone === "red" ? "text-red" : "text-accent";
  return (
    <section className="flex min-h-32 flex-col justify-between rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        <span className={`grid size-8 place-items-center rounded-md bg-surface-high ${color}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <strong
          className={`text-2xl font-bold tracking-tight sm:text-3xl ${tone === "red" ? "text-red" : "text-foreground"}`}
        >
          {value}
        </strong>
        <span className={`font-mono text-[11px] font-semibold ${color}`}>{note}</span>
      </div>
    </section>
  );
}
