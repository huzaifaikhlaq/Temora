export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "urgent" | "high" | "medium" | "low";

export interface Issue {
  id: string;
  workspace_id: string;
  project_id: string;
  key: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee_id: string | null;
  reporter_id: string;
  due_date: string | null;
  story_points: number;
  sprint_id: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export type CreateIssueInput = Pick<Issue, "project_id" | "title"> & Partial<Pick<Issue, "description" | "status" | "priority" | "assignee_id" | "due_date" | "story_points" | "sprint_id" | "labels">>;
export type UpdateIssueInput = Partial<Omit<CreateIssueInput, "project_id">>;
const BASE = "/api/issue";

async function request<T>(path: string, method: "GET" | "POST" | "PATCH" = "GET", data?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/${path}`, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(data ?? {}),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed." }));
    throw new Error(typeof error.detail === "string" ? error.detail : JSON.stringify(error));
  }
  return response.json() as Promise<T>;
}

function base(workspaceId: string) { return `workspaces/${workspaceId}/issues`; }

export const issueApi = {
  list: (workspaceId: string, projectId?: string) => request<Issue[]>(`${base(workspaceId)}${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ""}`),
  create: (workspaceId: string, data: CreateIssueInput) => request<Issue>(base(workspaceId), "POST", data),
  get: (workspaceId: string, issueId: string) => request<Issue>(`${base(workspaceId)}/${issueId}`),
  update: (workspaceId: string, issueId: string, data: UpdateIssueInput) => request<Issue>(`${base(workspaceId)}/${issueId}`, "PATCH", data),
};
