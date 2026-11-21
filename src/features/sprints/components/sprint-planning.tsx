"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

import { Icon } from "@/components/shared/icon";
import {
  issueApi,
  type Issue,
  type IssuePriority,
  type IssueStatus,
} from "@/features/issues/api/client";
import {
  projectApi,
  type Project,
} from "@/features/projects/api/client";
import {
  sprintApi,
  type Sprint,
} from "@/features/sprints/lib/api";
import { workspaceApi } from "@/features/workspace/api/client";
import { workspaceMemberLabel } from "@/features/workspace/member-label";
import type { WorkspaceMember } from "@/features/workspace/types";

type Props = {
  workspaceId: string;
  projectId: string;
};

type BurndownSnapshot = {
  date: string;
  total_points: number;
  completed_points: number;
  remaining_points: number;
  total_issues: number;
  completed_issues: number;
};

type BurndownData = {
  sprint: Sprint;
  snapshots: BurndownSnapshot[];
};

type SprintStats = {
  issues: Issue[];
  committedPoints: number;
  completedPoints: number;
  completedIssues: number;
  openIssues: number;
  pointsRemaining: number;
  completionPercent: number;
  capacityPercent: number;
  assigneeCount: number;
};

const inputClass =
  "w-full rounded-xl border border-border/60 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-outline focus:border-accent focus:ring-2 focus:ring-accent/20";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const statusLabels: Record<IssueStatus, string> = {
  backlog: "Backlog",
  to_do: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const priorityLabels: Record<IssuePriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function dateValue(value: string) {
  return Date.parse(value.includes("T") ? value : value + "T00:00:00Z");
}

function formatDate(value: string) {
  const time = dateValue(value);
  if (!Number.isFinite(time)) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(time);
}

function daysUntil(value: string) {
  const target = dateValue(value);
  if (!Number.isFinite(target)) return null;

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((target - today) / 86_400_000);
}

function sprintStatusLabel(status: Sprint["status"]) {
  if (status === "active") return "Active";
  if (status === "completing") return "Completing";
  if (status === "completed") return "Completed";
  return "Planned";
}

function sprintStatusClass(status: Sprint["status"]) {
  if (status === "active") return "bg-emerald-100 text-emerald-900";
  if (status === "completing") return "bg-amber-100 text-amber-900";
  if (status === "completed") return "bg-surface-high text-muted";
  return "bg-accent/10 text-accent-strong";
}

function issueStatusClass(status: IssueStatus) {
  if (status === "done") return "bg-emerald-100 text-emerald-900";
  if (status === "in_review") return "bg-amber-100 text-amber-900";
  if (status === "in_progress") return "bg-accent/10 text-accent-strong";
  if (status === "to_do") return "bg-sky-100 text-sky-900";
  return "bg-surface-high text-muted";
}

function priorityClass(priority: IssuePriority) {
  if (priority === "urgent") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-900";
  if (priority === "medium") return "bg-surface-high text-muted";
  return "bg-surface-low text-muted";
}

function issueTypeIcon(type: Issue["issue_type"]) {
  if (type === "bug") return "bug_report";
  if (type === "epic") return "account_tree";
  if (type === "story") return "bookmark";
  return "task_alt";
}

function issueTypeLabel(type: Issue["issue_type"]) {
  if (type === "epic") return "Epic";
  if (type === "story") return "Story";
  if (type === "bug") return "Bug";
  return "Task";
}

function getSprintStats(sprint: Sprint, allIssues: Issue[]): SprintStats {
  const assigned = allIssues.filter((issue) => issue.sprint_id === sprint.id);
  const issuePoints = assigned.reduce(
    (sum, issue) => sum + (issue.story_points ?? 0),
    0,
  );
  const committedPoints = sprint.committed_points || issuePoints;
  const completedPoints =
    sprint.status === "completed"
      ? sprint.completed_points
      : assigned
          .filter((issue) => issue.status === "done")
          .reduce((sum, issue) => sum + (issue.story_points ?? 0), 0);
  const completedIssues =
    sprint.status === "completed"
      ? sprint.completed_issues
      : assigned.filter((issue) => issue.status === "done").length;
  const totalIssues = assigned.length || sprint.committed_issues;
  const capacityPercent =
    sprint.capacity_points > 0
      ? Math.min(100, Math.round((committedPoints / sprint.capacity_points) * 100))
      : 0;

  return {
    issues: assigned,
    committedPoints,
    completedPoints,
    completedIssues,
    openIssues: Math.max(0, totalIssues - completedIssues),
    pointsRemaining: Math.max(0, committedPoints - completedPoints),
    completionPercent:
      committedPoints > 0
        ? Math.min(100, Math.round((completedPoints / committedPoints) * 100))
        : 0,
    capacityPercent,
    assigneeCount: new Set(
      assigned.map((issue) => issue.assignee_id).filter((id): id is string => Boolean(id)),
    ).size,
  };
}

function getIssueCategory(issue: Issue, epicLabels: Map<string, string>) {
  if (issue.components?.length) return issue.components[0];
  if (issue.tags?.length) return issue.tags[0];
  if (issue.epic_id) return epicLabels.get(issue.epic_id) ?? "Epic";
  return issueTypeLabel(issue.issue_type);
}

function getAssigneeLabel(id: string | null, memberLabels: Map<string, string>) {
  if (!id) return "Unassigned";
  return memberLabels.get(id) ?? "Member " + id.slice(0, 8);
}

export function SprintPlanning({ workspaceId, projectId }: Props) {
  const base = "workspaces/" + workspaceId + "/projects/" + projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState(40);

  const [sprintQuery, setSprintQuery] = useState("");
  const [backlogQuery, setBacklogQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [epicFilter, setEpicFilter] = useState("all");

  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [draggedIssueId, setDraggedIssueId] = useState("");
  const [dropTarget, setDropTarget] = useState("");
  const [snapshots, setSnapshots] = useState<BurndownSnapshot[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const load = useCallback(async () => {
    setError("");

    try {
      const [sprintData, issueData, projectData, memberData] = await Promise.all([
        sprintApi<Sprint[]>(base + "/sprints"),
        issueApi.list(workspaceId, projectId),
        projectApi.get(workspaceId, projectId).catch(() => null),
        workspaceApi.members(workspaceId).catch(() => [] as WorkspaceMember[]),
      ]);

      setSprints(sprintData);
      setIssues(issueData);
      setProject(projectData);
      setMembers(memberData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load sprint planning.");
    } finally {
      setLoading(false);
    }
  }, [base, projectId, workspaceId]);

  const orderedSprints = useMemo(() => {
    const rank: Record<Sprint["status"], number> = {
      active: 0,
      completing: 1,
      planned: 2,
      completed: 3,
    };

    return [...sprints].sort((left, right) => rank[left.status] - rank[right.status]);
  }, [sprints]);

  const activeSprint = useMemo(
    () => sprints.find((sprint) => sprint.status === "active" || sprint.status === "completing") ?? null,
    [sprints],
  );

  const activeSprintId = activeSprint?.id ?? "";

  const backlog = useMemo(
    () => issues.filter((issue) => !issue.sprint_id),
    [issues],
  );

  const epicLabels = useMemo(
    () =>
      new Map(
        issues
          .filter((issue) => issue.issue_type === "epic")
          .map((issue) => [issue.id, issue.key] as const),
      ),
    [issues],
  );

  const epicOptions = useMemo(
    () => issues.filter((issue) => issue.issue_type === "epic"),
    [issues],
  );

  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          backlog
            .map((issue) => issue.assignee_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [backlog],
  );

  const filteredBacklog = useMemo(() => {
    const query = backlogQuery.trim().toLowerCase();

    return backlog.filter((issue) => {
      const matchesText =
        !query ||
        issue.key.toLowerCase().includes(query) ||
        issue.title.toLowerCase().includes(query) ||
        issue.tags?.some((tag) => tag.toLowerCase().includes(query));

      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "assigned" && Boolean(issue.assignee_id)) ||
        (assigneeFilter === "unassigned" && !issue.assignee_id) ||
        issue.assignee_id === assigneeFilter;

      const matchesEpic =
        epicFilter === "all" ||
        (epicFilter === "none" && !issue.epic_id) ||
        issue.epic_id === epicFilter;

      return matchesText && matchesAssignee && matchesEpic;
    });
  }, [assigneeFilter, backlog, backlogQuery, epicFilter]);

  const activeStats = activeSprint ? getSprintStats(activeSprint, issues) : null;
  const backlogPoints = backlog.reduce(
    (sum, issue) => sum + (issue.story_points ?? 0),
    0,
  );
  const eligibleSprints = sprints.filter(
    (sprint) => sprint.status === "planned" || sprint.status === "active",
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    let current = true;

    if (!activeSprintId) {
      queueMicrotask(() => {
        if (!current) return;
        setSnapshots([]);
        setChartLoading(false);
      });
      return () => {
        current = false;
      };
    }

    queueMicrotask(() => {
      if (current) setChartLoading(true);
    });

    sprintApi<BurndownData>("sprints/" + activeSprintId + "/burndown")
      .then((result) => {
        if (current) setSnapshots(result.snapshots ?? []);
      })
      .catch(() => {
        if (current) setSnapshots([]);
      })
      .finally(() => {
        if (current) setChartLoading(false);
      });

    return () => {
      current = false;
    };
  }, [activeSprintId]);

  async function createSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await sprintApi(base + "/sprints", "POST", {
        name,
        goal,
        start_date: startDate,
        end_date: endDate,
        capacity_points: capacity,
      });

      setCreating(false);
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      setCapacity(40);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sprint creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function startSprint(id: string) {
    setBusy(true);
    setError("");

    try {
      await sprintApi("sprints/" + id + "/start", "POST", {});
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sprint could not be started.");
    } finally {
      setBusy(false);
    }
  }

  async function assignIssue(issueId: string, sprintId: string | null) {
    setBusy(true);
    setError("");

    try {
      await issueApi.update(workspaceId, projectId, issueId, {
        sprint_id: sprintId,
      });
      const issue = issues.find((item) => item.id === issueId);
      const destination = sprintId
        ? sprints.find((item) => item.id === sprintId)?.name ?? "the selected sprint"
        : "the product backlog";
      setAnnouncement(
        "Moved " + (issue?.key ?? "issue") + " to " + destination + ".",
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Issue assignment failed.");
    } finally {
      setBusy(false);
    }
  }

  function startIssueDrag(event: DragEvent<HTMLButtonElement>, issueId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", issueId);
    setDraggedIssueId(issueId);
  }

  function allowIssueDrop(event: DragEvent<HTMLElement>, target: string) {
    if (!draggedIssueId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(target);
  }

  function dropIssue(event: DragEvent<HTMLElement>, destination: string | null) {
    event.preventDefault();
    const issueId = event.dataTransfer.getData("text/plain") || draggedIssueId;
    setDropTarget("");
    setDraggedIssueId("");
    if (!issueId) return;

    const issue = issues.find((item) => item.id === issueId);
    if (!issue || issue.sprint_id === destination) return;

    void assignIssue(issueId, destination);
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-surface-bright px-4 py-8 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-7xl animate-pulse text-sm text-muted" role="status">
          Loading sprint planning…
        </p>
      </main>
    );
  }

  const availableAssignees = new Map<string, string>(
    members.map((member) => [member.user_id, workspaceMemberLabel(member)] as const),
  );
  const memberLabels = availableAssignees;

  const projectTabs: {
    label: string;
    href: string;
    icon: string;
    active?: boolean;
  }[] = [
    { label: "Overview", href: "/projects/" + projectId, icon: "dashboard" },
    { label: "Board", href: "/projects/" + projectId + "/board", icon: "view_kanban" },
    {
      label: "Sprints & Backlog",
      href: "/projects/" + projectId + "/sprints",
      icon: "cycle",
      active: true,
    },
    { label: "Members", href: "/projects/" + projectId + "/members", icon: "group" },
    { label: "Settings", href: "/projects/" + projectId + "/settings", icon: "settings" },
  ];

  const projectName = project?.name ?? "Project";
  const displayProjectKey = project?.key ?? "SPRINTS";

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] space-y-6 bg-surface-bright px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <Icon name="error_outline" size={19} className="mt-0.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-9 rounded-lg px-3 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Retry loading
            </button>
          </div>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <header className="flex flex-col gap-4 border-b border-border/30 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Icon name="view_timeline" size={25} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {projectName}
                </h1>
                <span className="rounded-full bg-surface-high px-3 py-1 font-mono text-xs font-semibold tracking-wide text-muted">
                  {displayProjectKey}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted sm:text-base">
                Sprint Planning
                {activeSprint ? " · Scrum Cycle " + activeSprint.number : " · Plan your next cycle"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeSprint ? (
              <Link
                href={"/reports/sprints/" + activeSprint.id}
                className={secondaryButtonClass}
              >
                <Icon name="trending_up" size={18} className="text-accent" />
                Burndown Velocity
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/40 bg-surface-low px-4 text-sm font-medium text-muted">
                <Icon name="trending_up" size={18} />
                Burndown Velocity
              </span>
            )}
            <Link
              href={"/projects/" + projectId + "/settings"}
              className={secondaryButtonClass}
            >
              <Icon name="tune" size={18} />
              Project Settings
            </Link>
            {activeSprint?.status === "active" && (
              <Link
                href={"/sprints/" + activeSprint.id + "/complete"}
                className={primaryButtonClass}
              >
                <Icon name="check_circle" size={19} />
                Complete Sprint
              </Link>
            )}
          </div>
        </div>

        <nav aria-label="Project navigation" className="flex gap-1 overflow-x-auto pb-1">
          {projectTabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
                (tab.active
                  ? "bg-accent/10 text-accent-strong"
                  : "text-muted hover:bg-surface-low hover:text-foreground")
              }
            >
              <Icon name={tab.icon} size={19} />
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <section
        aria-label="Current sprint summary"
        className="grid gap-4 rounded-2xl border border-border/30 bg-white p-4 shadow-sm sm:p-5 2xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(10rem,1fr))]"
      >
        <div className="flex min-w-0 flex-col justify-center">
          {activeSprint ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {activeSprint.name}
                </h2>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-semibold " +
                    sprintStatusClass(activeSprint.status)
                  }
                >
                  <span className="mr-1.5 inline-block size-2 rounded-full bg-current align-middle" />
                  {sprintStatusLabel(activeSprint.status)}
                </span>
                {activeSprint.status === "active" && (
                  <span className="rounded-md bg-surface-high px-2.5 py-1 font-mono text-xs text-muted">
                    {daysUntil(activeSprint.end_date) === null
                      ? formatDate(activeSprint.end_date)
                      : daysUntil(activeSprint.end_date) === 0
                        ? "Ends today"
                        : daysUntil(activeSprint.end_date)! > 0
                          ? "Ends in " + daysUntil(activeSprint.end_date) + " days"
                          : "Ended " + Math.abs(daysUntil(activeSprint.end_date)!) + " days ago"}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
                <strong className="font-semibold text-foreground">Goal:</strong>{" "}
                {activeSprint.goal || "No sprint goal has been set."}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatDate(activeSprint.start_date)} – {formatDate(activeSprint.end_date)}
              </p>
            </>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                Sprint planning
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                No active sprint
              </h2>
              <p className="mt-2 text-sm text-muted">
                Create a sprint or start a planned one to track delivery here.
              </p>
            </div>
          )}
        </div>

        {activeSprint && activeStats ? (
          <>
            <div className="rounded-xl bg-surface-low p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-semibold tracking-wide text-muted">
                  Points Done
                </p>
                <span className="text-sm font-bold text-accent">
                  {activeStats.completionPercent}%
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {activeStats.completedPoints}
                <span className="ml-1.5 text-base font-medium text-muted">
                  / {activeStats.committedPoints} pts
                </span>
              </p>
              <progress
                className="mt-3 h-2 w-full accent-accent"
                value={activeStats.completionPercent}
                max={100}
                aria-label="Current sprint points complete"
              />
            </div>

            <div className="rounded-xl bg-surface-low p-4">
              <p className="font-mono text-xs font-semibold tracking-wide text-muted">
                Total Issues
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {activeStats.issues.length || activeSprint.committed_issues}
                <span className="ml-1.5 text-base font-medium text-muted">tasks</span>
              </p>
              <p className="mt-2 text-sm">
                <span className="font-semibold text-emerald-700">
                  {activeStats.completedIssues} Done
                </span>
                <span className="mx-2 text-outline">•</span>
                <span className="font-medium text-muted">{activeStats.openIssues} Open</span>
              </p>
            </div>

            <div className="rounded-xl bg-surface-low p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-semibold tracking-wide text-muted">
                  Team Capacity
                </p>
                <span className="text-sm font-bold text-emerald-700">
                  {activeStats.capacityPercent}%
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {activeStats.assigneeCount}
                <span className="ml-1.5 text-base font-medium text-muted">
                  {activeStats.assigneeCount === 1 ? "assignee" : "assignees"}
                </span>
              </p>
              <progress
                className="mt-3 h-2 w-full accent-emerald-700"
                value={activeStats.capacityPercent}
                max={100}
                aria-label="Committed sprint points as a percentage of capacity"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center rounded-xl bg-surface-low p-4 text-sm text-muted sm:col-span-2 2xl:col-span-3">
            Choose a planned sprint below to review its capacity and scope.
          </div>
        )}
      </section>

      <BurndownVelocity
        sprint={activeSprint}
        snapshots={snapshots}
        loading={chartLoading}
      />

      <section aria-labelledby="sprints-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
              Delivery plan
            </p>
            <h2 id="sprints-heading" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Sprints
            </h2>
          </div>
          <label className="relative block w-full sm:w-72">
            <Icon
              name="search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              aria-label="Filter sprint issues"
              value={sprintQuery}
              onChange={(event) => setSprintQuery(event.target.value)}
              placeholder="Filter sprint issues..."
              className={inputClass + " pl-10"}
            />
          </label>
        </div>

        {orderedSprints.map((sprint) => {
          const stats = getSprintStats(sprint, issues);
          const query = sprintQuery.trim().toLowerCase();
          const displayedIssues = stats.issues.filter(
            (issue) =>
              !query ||
              issue.key.toLowerCase().includes(query) ||
              issue.title.toLowerCase().includes(query),
          );
          const remainingPoints = stats.pointsRemaining;
          const capacityText =
            sprint.status === "active" || sprint.status === "completing"
              ? remainingPoints + " SP Remaining / " + stats.completedPoints + " Done"
              : sprint.status === "planned"
                ? stats.committedPoints +
                  " / " +
                  sprint.capacity_points +
                  " SP Capacity (" +
                  stats.capacityPercent +
                  "%)"
                : stats.completedPoints + " SP Done / " + stats.committedPoints + " SP";

          return (
            <article
              key={sprint.id}
              onDragOver={
                sprint.status === "planned" || sprint.status === "active"
                  ? (event) => allowIssueDrop(event, "sprint:" + sprint.id)
                  : undefined
              }
              onDragLeave={() => {
                if (dropTarget === "sprint:" + sprint.id) setDropTarget("");
              }}
              onDrop={
                sprint.status === "planned" || sprint.status === "active"
                  ? (event) => dropIssue(event, sprint.id)
                  : undefined
              }
              className={
                "overflow-clip rounded-2xl border bg-white shadow-sm transition " +
                (dropTarget === "sprint:" + sprint.id
                  ? "border-accent ring-2 ring-inset ring-accent"
                  : "border-border/30")
              }
            >
              <header className="flex flex-col gap-3 bg-surface-low/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <Icon name="expand_more" size={22} className="text-muted" />
                  <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                    {sprint.name}
                    <span className="ml-2 text-sm font-medium text-muted">
                      ({sprint.status === "active"
                        ? "Active Sprint"
                        : sprint.status === "completing"
                          ? "Completing"
                          : sprint.status === "planned"
                            ? "Planned / Next"
                            : "Completed"})
                    </span>
                  </h3>
                  <span className="font-mono text-xs tracking-wide text-muted">
                    {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
                  </span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent-strong">
                    {capacityText}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "rounded-full px-3 py-1.5 text-xs font-semibold " +
                      sprintStatusClass(sprint.status)
                    }
                  >
                    {sprintStatusLabel(sprint.status)}
                  </span>
                  {sprint.status === "planned" && (
                    <button
                      type="button"
                      disabled={busy || Boolean(activeSprint)}
                      onClick={() => void startSprint(sprint.id)}
                      className={primaryButtonClass + " min-h-9 px-3 py-2 text-xs"}
                    >
                      <Icon name="play_arrow" size={18} />
                      Start Sprint
                    </button>
                  )}
                  {(sprint.status === "active" || sprint.status === "completed") && (
                    <Link
                      href={"/sprints/" + sprint.id + "/retrospective"}
                      className={secondaryButtonClass + " min-h-9 px-3 py-2 text-xs"}
                    >
                      Retrospective
                    </Link>
                  )}
                  <Link
                    href={"/reports/sprints/" + sprint.id}
                    aria-label={"Open burndown report for " + sprint.name}
                    className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Icon name="query_stats" />
                  </Link>
                </div>
              </header>

              {sprint.status === "planned" && sprint.goal && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/20 px-4 py-3 text-sm sm:px-5">
                  <p className="min-w-0">
                    <strong className="font-semibold">Sprint Goal:</strong>{" "}
                    <span className="text-muted">{sprint.goal}</span>
                  </p>
                  <span className="font-mono text-xs text-muted">
                    {stats.issues.length} issues committed · {stats.committedPoints} story points
                  </span>
                </div>
              )}

              <div
                role="region"
                aria-label={sprint.name + " issues"}
                tabIndex={0}
                className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">{sprint.name} assigned issues</caption>
                  <thead className="bg-surface-low">
                    <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                      <th scope="col" className="w-[34%] px-4 py-3 font-semibold sm:px-5">
                        Issue key &amp; title
                      </th>
                      <th scope="col" className="w-[15%] px-3 py-3 font-semibold">
                        Epic / Category
                      </th>
                      <th scope="col" className="w-[8%] px-3 py-3 font-semibold">
                        Estimate
                      </th>
                      <th scope="col" className="w-[10%] px-3 py-3 font-semibold">
                        Priority
                      </th>
                      <th scope="col" className="w-[12%] px-3 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="w-[11%] px-3 py-3 font-semibold">
                        Assignee
                      </th>
                      <th scope="col" className="w-[10%] px-3 py-3 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedIssues.map((issue) => (
                      <tr
                        key={issue.id}
                        className="group border-b border-border/20 transition-colors last:border-0 hover:bg-surface-bright"
                      >
                        <IssueCells
                          issue={issue}
                          projectId={projectId}
                          category={getIssueCategory(issue, epicLabels)}
                          assignee={getAssigneeLabel(issue.assignee_id, memberLabels)}
                          draggable={sprint.status === "planned" || sprint.status === "active"}
                          onDragStart={startIssueDrag}
                          onDragEnd={() => {
                            setDraggedIssueId("");
                            setDropTarget("");
                          }}
                        />
                        <td className="px-3 py-3 text-right">
                          {(sprint.status === "planned" || sprint.status === "active") && (
                            <label className="block">
                              <span className="sr-only">Move {issue.key} to a sprint or backlog</span>
                              <select
                                aria-label={"Move " + issue.key + " from " + sprint.name}
                                disabled={busy}
                                value=""
                                onChange={(event) => {
                                  if (event.target.value === "__backlog__") {
                                    void assignIssue(issue.id, null);
                                  } else if (event.target.value) {
                                    void assignIssue(issue.id, event.target.value);
                                  }
                                }}
                                className="min-h-9 max-w-full rounded-lg border border-border/50 bg-white px-2 text-xs text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                              >
                                <option value="">Move to...</option>
                                <option value="__backlog__">Product Backlog</option>
                                {eligibleSprints
                                  .filter((targetSprint) => targetSprint.id !== sprint.id)
                                  .map((targetSprint) => (
                                    <option key={targetSprint.id} value={targetSprint.id}>
                                      {targetSprint.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                    {displayedIssues.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-9 text-center text-sm text-muted">
                          {stats.issues.length === 0
                            ? "No issues assigned to this sprint yet."
                            : "No sprint issues match this filter."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 px-4 py-3 sm:px-5">
                <Link
                  href="#product-backlog"
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted transition hover:bg-surface-low hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Icon name="add_circle" size={19} />
                  Choose issues from the backlog below
                </Link>
                <span className="font-mono text-xs text-muted">
                  {displayedIssues.length} of {stats.issues.length} issues displayed
                </span>
              </footer>
            </article>
          );
        })}

        {orderedSprints.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-white px-5 py-10 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon name="cycle" size={22} />
            </span>
            <h3 className="mt-3 font-semibold">No sprints yet</h3>
            <p className="mt-1 text-sm text-muted">
              Create a sprint to organize backlog issues into a delivery cycle.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={primaryButtonClass + " mt-4"}
            >
              <Icon name="add" size={18} />
              Create Sprint
            </button>
          </div>
        )}
      </section>

      <section
        id="product-backlog"
        aria-labelledby="backlog-heading"
        onDragOver={(event) => allowIssueDrop(event, "backlog")}
        onDragLeave={() => {
          if (dropTarget === "backlog") setDropTarget("");
        }}
        onDrop={(event) => dropIssue(event, null)}
        className={
          "overflow-clip rounded-2xl border bg-white shadow-sm transition " +
          (dropTarget === "backlog"
            ? "border-accent ring-2 ring-inset ring-accent"
            : "border-border/30")
        }
      >
        <header className="grid gap-4 bg-surface-low/60 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="backlog-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
              Product Backlog
            </h2>
            <span className="rounded-full bg-surface-high px-3 py-1.5 font-mono text-xs font-semibold text-muted">
              {backlog.length} {backlog.length === 1 ? "issue" : "issues"}
            </span>
            <span className="font-mono text-xs tracking-wide text-muted">
              {backlogPoints} Story Points Total
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.4fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_auto]">
            <label className="relative block">
              <Icon
                name="search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                aria-label="Filter backlog issues"
                value={backlogQuery}
                onChange={(event) => setBacklogQuery(event.target.value)}
                placeholder="Filter backlog issues..."
                className={inputClass + " bg-white pl-10"}
              />
            </label>
            <label>
              <span className="sr-only">Filter backlog by assignee</span>
              <select
                aria-label="Filter by assignee"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className={inputClass + " h-11"}
              >
                <option value="all">All Assignees</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
                {assigneeOptions.map((id) => (
                  <option key={id} value={id}>
                    {availableAssignees.get(id) ?? "Member " + id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter backlog by epic</span>
              <select
                aria-label="Filter by epic"
                value={epicFilter}
                onChange={(event) => setEpicFilter(event.target.value)}
                className={inputClass + " h-11"}
              >
                <option value="all">All Epics</option>
                <option value="none">No Epic</option>
                {epicOptions.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.key} · {epic.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={secondaryButtonClass + " h-11 px-3"}
            >
              <Icon name="add" size={18} />
              Create Sprint
            </button>
          </div>
        </header>

        <div
          role="region"
          aria-label="Product backlog issues"
          tabIndex={0}
          className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-sm">
            <caption className="sr-only">Product backlog issues</caption>
            <thead className="bg-surface-low">
              <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                <th scope="col" className="w-[34%] px-4 py-3 font-semibold sm:px-5">
                  Issue key &amp; title
                </th>
                <th scope="col" className="w-[15%] px-3 py-3 font-semibold">
                  Epic / Category
                </th>
                <th scope="col" className="w-[8%] px-3 py-3 font-semibold">
                  Estimate
                </th>
                <th scope="col" className="w-[10%] px-3 py-3 font-semibold">
                  Priority
                </th>
                <th scope="col" className="w-[12%] px-3 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="w-[11%] px-3 py-3 font-semibold">
                  Assignee
                </th>
                <th scope="col" className="w-[10%] px-3 py-3 font-semibold">
                  Add to Sprint
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBacklog.map((issue) => (
                <tr
                  key={issue.id}
                  className="group border-b border-border/20 transition-colors last:border-0 hover:bg-surface-bright"
                >
                  <IssueCells
                    issue={issue}
                    projectId={projectId}
                    category={getIssueCategory(issue, epicLabels)}
                    assignee={getAssigneeLabel(issue.assignee_id, memberLabels)}
                    draggable
                    onDragStart={startIssueDrag}
                    onDragEnd={() => {
                      setDraggedIssueId("");
                      setDropTarget("");
                    }}
                  />
                  <td className="px-3 py-2.5">
                    <label className="sr-only" htmlFor={"assign-" + issue.id}>
                      Assign {issue.key} to a sprint
                    </label>
                    <select
                      id={"assign-" + issue.id}
                      disabled={busy || eligibleSprints.length === 0}
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          void assignIssue(issue.id, event.target.value);
                        }
                      }}
                      className="min-h-9 w-full min-w-0 rounded-lg border border-border/50 bg-white px-2 text-xs text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                    >
                      <option value="">
                        {eligibleSprints.length ? "Add to Sprint..." : "No open sprint"}
                      </option>
                      {eligibleSprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}

              {filteredBacklog.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <span className="mx-auto grid size-10 place-items-center rounded-xl bg-surface-low text-muted">
                      <Icon name="inventory_2" size={21} />
                    </span>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {backlog.length === 0 ? "Your backlog is clear" : "No matching issues"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {backlog.length === 0
                        ? "Unscheduled project issues will appear here."
                        : "Try another search or adjust the filters."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 px-4 py-3 sm:px-5">
          <Link
            href="/work-items/new"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted transition hover:bg-surface-low hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon name="add_circle" size={19} />
            Create new backlog issue
          </Link>
          <span className="font-mono text-xs text-muted">
            Showing {filteredBacklog.length} of {backlog.length} issues
          </span>
        </footer>
      </section>

      {creating && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={createSprint}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-sprint-title"
            className="max-h-[min(90dvh,48rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-border/30 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                  Sprint planning
                </p>
                <h2 id="create-sprint-title" className="mt-1 text-xl font-semibold tracking-tight">
                  Create New Sprint
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close create sprint form"
                disabled={busy}
                onClick={() => setCreating(false)}
                className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-low hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <Icon name="close" />
              </button>
            </div>

            <label className="block text-sm font-medium">
              Sprint name
              <input
                required
                maxLength={100}
                className={inputClass + " mt-1.5"}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Sprint 16"
              />
            </label>

            <label className="block text-sm font-medium">
              Sprint goal <span className="font-normal text-muted">(optional)</span>
              <textarea
                maxLength={1000}
                className={inputClass + " mt-1.5 min-h-24 resize-y"}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="What should the team deliver?"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Start date
                <input
                  required
                  type="date"
                  className={inputClass + " mt-1.5"}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                End date
                <input
                  required
                  type="date"
                  min={startDate || undefined}
                  className={inputClass + " mt-1.5"}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Capacity points
              <input
                required
                type="number"
                min={1}
                max={10000}
                className={inputClass + " mt-1.5"}
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/25 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCreating(false)}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button disabled={busy} className={primaryButtonClass}>
                <Icon name="add" size={18} />
                {busy ? "Creating…" : "Create Sprint"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function IssueCells({
  issue,
  projectId,
  category,
  assignee,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  issue: Issue;
  projectId: string;
  category: string;
  assignee: string;
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>, issueId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <>
      <th scope="row" className="min-w-0 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          {draggable && (
            <button
              type="button"
              draggable
              aria-label={"Drag " + issue.key + " to another sprint or the backlog"}
              title="Drag issue to another sprint or the backlog"
              onDragStart={(event) => onDragStart(event, issue.id)}
              onDragEnd={onDragEnd}
              className="grid min-h-8 min-w-8 shrink-0 cursor-grab place-items-center rounded-md text-outline transition hover:bg-surface-low hover:text-accent active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              <Icon name="drag_indicator" size={18} />
            </button>
          )}
          <Icon
            name={issueTypeIcon(issue.issue_type)}
            size={19}
            className={
              issue.issue_type === "bug"
                ? "shrink-0 text-red-700"
                : issue.issue_type === "epic"
                  ? "shrink-0 text-emerald-700"
                  : "shrink-0 text-accent"
            }
          />
          <span className="shrink-0 font-mono text-xs font-semibold tracking-wide text-muted">
            {issue.key}
          </span>
          <Link
            href={"/projects/" + projectId + "/issues/" + issue.id}
            title={issue.title}
            className="block min-w-0 truncate font-medium text-foreground transition hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {issue.title}
          </Link>
        </div>
      </th>
      <td className="min-w-0 px-3 py-3">
        <span
          title={category}
          className="block max-w-full truncate rounded-md bg-surface-high px-2.5 py-1 font-mono text-[11px] text-muted"
        >
          {category}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="whitespace-nowrap rounded-md bg-surface-low px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
          {issue.story_points ?? 0} pts
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={
            "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold " +
            priorityClass(issue.priority)
          }
        >
          <Icon
            name={
              issue.priority === "urgent"
                ? "keyboard_double_arrow_up"
                : issue.priority === "high"
                  ? "north"
                  : issue.priority === "low"
                    ? "south"
                    : "remove"
            }
            size={15}
          />
          {priorityLabels[issue.priority]}
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold " +
            issueStatusClass(issue.status)
          }
        >
          <span className="size-1.5 rounded-full bg-current" />
          {statusLabels[issue.status]}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="flex min-w-0 items-center gap-2">
          {issue.assignee_id ? (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
              {issue.assignee_id.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-high text-muted">
              <Icon name="person_outline" size={16} />
            </span>
          )}
          <span className="min-w-0 truncate text-xs text-foreground" title={assignee}>
            {assignee}
          </span>
        </span>
      </td>
    </>
  );
}

function BurndownVelocity({
  sprint,
  snapshots,
  loading,
}: {
  sprint: Sprint | null;
  snapshots: BurndownSnapshot[];
  loading: boolean;
}) {
  if (!sprint) {
    return (
      <section className="rounded-2xl border border-border/30 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-accent">
          <Icon name="monitoring" size={22} />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Sprint Burndown Velocity
          </h2>
        </div>
        <p className="mt-3 text-sm text-muted">
          Start a sprint to see planned burn compared with recorded progress.
        </p>
      </section>
    );
  }

  const maxPoints = Math.max(
    1,
    sprint.committed_points,
    sprint.capacity_points,
    ...snapshots.map((snapshot) => snapshot.total_points),
  );
  const start = dateValue(sprint.start_date);
  const end = dateValue(sprint.end_date);
  const duration = Math.max(1, end - start);
  const left = 42;
  const right = 558;
  const top = 24;
  const bottom = 166;
  const getX = (value: string) =>
    left + ((right - left) * (dateValue(value) - start)) / duration;
  const getY = (points: number) =>
    top + ((bottom - top) * (maxPoints - points)) / maxPoints;
  const linePoints = snapshots
    .map((snapshot) => getX(snapshot.date) + "," + getY(snapshot.remaining_points))
    .join(" ");
  const areaPoints =
    snapshots.length > 0
      ? left + "," + bottom + " " + linePoints + " " + right + "," + bottom
      : "";
  const latest = snapshots[snapshots.length - 1];
  const latestX = latest ? getX(latest.date) : 0;
  const latestY = latest ? getY(latest.remaining_points) : 0;
  const latestLabelX = Math.min(right - 8, latestX + 12);
  const latestLabelAnchor = latestX > right - 110 ? "end" : "start";
  const idealY = getY(sprint.committed_points || sprint.capacity_points);

  return (
    <section
      aria-labelledby="burndown-heading"
      className="rounded-2xl border border-border/30 bg-white p-4 shadow-sm sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="monitoring" size={23} className="text-accent" />
          <h2 id="burndown-heading" className="text-lg font-semibold tracking-tight sm:text-xl">
            {sprint.name} Burndown Velocity
          </h2>
          <span className="rounded-md bg-surface-high px-2.5 py-1 font-mono text-xs text-muted">
            Ideal vs Actual
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-0 w-5 border-t-2 border-dashed border-outline" />
            Ideal Burn
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
            <span className="h-0 w-5 border-t-[3px] border-accent" />
            Actual Remaining
          </span>
        </div>
      </header>

      <div className="mt-4 rounded-2xl bg-surface-low p-2 sm:p-4">
        <svg
          viewBox="0 0 600 208"
          className="block h-48 w-full sm:h-56"
          role="img"
          aria-label={
            "Ideal and actual burndown for " +
            sprint.name +
            (latest ? ". " + latest.remaining_points + " points remain." : ".")
          }
        >
          {[0, 1, 2, 3].map((index) => {
            const y = top + index * ((bottom - top) / 3);
            return (
              <line
                key={index}
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke="var(--border)"
                strokeOpacity="0.45"
                strokeDasharray="4 6"
              />
            );
          })}

          <line
            x1={left}
            y1={idealY}
            x2={right}
            y2={bottom}
            stroke="var(--outline)"
            strokeWidth="2"
            strokeDasharray="7 6"
          />

          {snapshots.length > 0 && (
            <>
              <polygon points={areaPoints} fill="var(--accent)" fillOpacity="0.08" />
              <polyline
                points={linePoints}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {snapshots.map((snapshot) => (
                <circle
                  key={snapshot.date}
                  cx={getX(snapshot.date)}
                  cy={getY(snapshot.remaining_points)}
                  r="3.5"
                  fill="var(--accent)"
                >
                  <title>
                    {formatDate(snapshot.date)}: {snapshot.remaining_points} points remaining
                  </title>
                </circle>
              ))}
              {latest && (
                <text
                  x={latestLabelX}
                  y={Math.max(top + 10, latestY - 12)}
                  fill="var(--foreground)"
                  fontSize="12"
                  fontWeight="600"
                  textAnchor={latestLabelAnchor}
                >
                  {formatDate(latest.date)} · {latest.remaining_points} pts left
                </text>
              )}
            </>
          )}

          <text x={left} y="198" fill="var(--outline)" fontSize="11">
            {formatDate(sprint.start_date)}
          </text>
          <text
            x={right}
            y="198"
            fill="var(--outline)"
            fontSize="11"
            textAnchor="end"
          >
            {formatDate(sprint.end_date)}
          </text>
        </svg>
      </div>

      {!loading && snapshots.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          Daily burndown snapshots will appear as work is recorded.
        </p>
      )}
      {loading && (
        <p className="mt-3 text-xs text-muted" role="status">
          Loading sprint history…
        </p>
      )}
    </section>
  );
}
