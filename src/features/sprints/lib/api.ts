export type Sprint = {
  id: string;
  workspace_id: string;
  project_id: string;
  number: number;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  capacity_points: number;
  status: "planned" | "active" | "completing" | "completed";
  retrospective_phase: "collecting" | "voting" | "closed";
  committed_points: number;
  committed_issues: number;
  completed_points: number;
  completed_issues: number;
  carryover_points: number;
  carryover_issues: number;
  completion_snapshot: Record<string, unknown>;
  ai_themes: string[];
};

export type SprintIssue = {
  id: string;
  key: string;
  title: string;
  status: string;
  story_points: number | null;
  sprint_id: string | null;
};

export type SprintMetrics = {
  total_issues: number;
  completed_issues: number;
  open_issues: number;
  total_points: number;
  completed_points: number;
  remaining_points: number;
  velocity_percent: number;
};

export type RetroNote = {
  id: string;
  category: "went_well" | "improve" | "ideas" | "action";
  body: string;
  author_id: string;
  assignee_id: string | null;
  due_date: string | null;
  action_status: "assigned" | "in_progress" | "done";
  vote_count: number;
  voted: boolean;
  comments: {
    id: string;
    author_id: string;
    body: string;
  }[];
};

export async function sprintApi<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`/api/sprint/${path.replace(/^\/|\/$/g, "")}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);

    const message =
      typeof payload?.detail === "string"
        ? payload.detail
        : JSON.stringify(payload ?? "Request failed");

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
