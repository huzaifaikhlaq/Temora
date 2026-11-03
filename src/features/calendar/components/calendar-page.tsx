"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Panel } from "@/components/shared/dashboard-ui";
import { WorkspacePageHeader, WorkspacePageShell } from "@/components/shared/workspace-page-ui";
import { useDemoState } from "@/features/workspace/hooks/use-demo-state";

type CalendarPeriod = "Month" | "Week" | "Day";
const button =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong";
const softButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-surface-low";

export function CalendarPage() {
  const state = useDemoState();
  const [period, setPeriod] = useState<CalendarPeriod>("Month");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const calendarMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const calendarGridStart =
    period === "Month"
      ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - calendarMonth.getDay())
      : period === "Week"
        ? new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth(),
            calendarDate.getDate() - calendarDate.getDay(),
          )
        : new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate());
  const calendarDays = period === "Month" ? 42 : period === "Week" ? 7 : 1;
  const events = useMemo(() => {
    const byDate = new Map<string, string[]>();
    const add = (date: string | null, title: string) => {
      if (!date) return;
      byDate.set(date, [...(byDate.get(date) ?? []), title]);
    };
    state.tasks
      .filter((task) => task.workspaceId === state.activeWorkspaceId)
      .forEach((task) => add(task.dueDate, `${task.key} · ${task.title}`));
    state.sprints
      .filter((sprint) => sprint.workspaceId === state.activeWorkspaceId)
      .forEach((sprint) => add(sprint.startDate, `${sprint.name} starts`));
    return byDate;
  }, [state.activeWorkspaceId, state.tasks, state.sprints]);
  const dateLabel =
    period === "Day"
      ? calendarDate.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : period === "Week"
        ? `${calendarGridStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(calendarGridStart.getFullYear(), calendarGridStart.getMonth(), calendarGridStart.getDate() + 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
        : calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function movePeriod(direction: -1 | 1) {
    setCalendarDate(
      period === "Month"
        ? new Date(calendarDate.getFullYear(), calendarDate.getMonth() + direction, 1)
        : new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth(),
            calendarDate.getDate() + direction * (period === "Week" ? 7 : 1),
          ),
    );
  }

  return (
    <WorkspacePageShell>
      <WorkspacePageHeader
        title="Planning Calendar"
        subtitle="See sprint cycles, project milestones, and task due dates across your workspace."
        action={
          <Link className={button} href="/tasks/new">
            <Icon name="add" />
            New Task / Deadline
          </Link>
        }
      />
      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className={softButton}
              aria-label={`Previous ${period.toLowerCase()}`}
              onClick={() => movePeriod(-1)}
            >
              ‹
            </button>
            <h2 className="min-w-36 text-center text-lg font-semibold">{dateLabel}</h2>
            <button
              className={softButton}
              aria-label={`Next ${period.toLowerCase()}`}
              onClick={() => movePeriod(1)}
            >
              ›
            </button>
            <button className={softButton} onClick={() => setCalendarDate(new Date())}>
              Today
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-surface-low p-1" aria-label="Calendar view">
            {(["Month", "Week", "Day"] as const).map((view) => (
              <button
                key={view}
                aria-pressed={period === view}
                onClick={() => setPeriod(view)}
                className={`rounded-md px-3 py-1.5 text-sm ${period === view ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        <div
          className={`grid ${period === "Day" ? "grid-cols-1" : "grid-cols-7"} border-l border-t border-border text-center text-xs text-muted`}
        >
          {(period === "Day"
            ? [calendarDate.toLocaleDateString(undefined, { weekday: "long" })]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((day) => (
            <div className="border-b border-r border-border py-2 font-semibold" key={day}>
              {day}
            </div>
          ))}
          {Array.from({ length: calendarDays }, (_, index) => {
            const date = new Date(
              calendarGridStart.getFullYear(),
              calendarGridStart.getMonth(),
              calendarGridStart.getDate() + index,
            );
            const inMonth = period !== "Month" || date.getMonth() === calendarMonth.getMonth();
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const dayEvents = events.get(dateKey) ?? [];
            return (
              <div
                key={dateKey}
                className={`${period === "Day" ? "min-h-[28rem]" : "min-h-24"} border-b border-r border-border p-2 text-left ${inMonth ? "bg-white" : "bg-surface-low/60 text-outline"}`}
              >
                <span
                  className={`text-xs ${date.toDateString() === new Date().toDateString() ? "grid size-6 place-items-center rounded-full bg-accent text-white" : ""}`}
                >
                  {date.getDate()}
                </span>
                {dayEvents.slice(0, 2).map((event, eventIndex) => (
                  <Link
                    key={`${event}-${eventIndex}`}
                    href={
                      event.split(" · ")[0].startsWith("TEM-")
                        ? `/tasks/${event.split(" · ")[0]}`
                        : "/projects"
                    }
                    className={`mt-2 block truncate rounded px-1.5 py-1 text-[10px] font-medium ${eventIndex === 0 ? "bg-accent/10 text-accent" : "bg-emerald-50 text-emerald-800"}`}
                  >
                    {event}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </Panel>
    </WorkspacePageShell>
  );
}
