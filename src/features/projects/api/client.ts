export type ProjectStatus = "planning" | "in_progress" | "in_review" | "completed";

export interface Project {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  status: ProjectStatus;
  progress: number;
  due_date: string | null;
  created_by: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateProjectInput = {
  name: string;
  description?: string;
  category?: string;
  due_date?: string | null;
};

export type UpdateProjectInput = Partial<
  Pick<Project, "name" | "description" | "category" | "status" | "progress" | "due_date">
>;

const BASE = "/api/project";

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`${BASE}/${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify(data ?? {}),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed." }));

    throw new Error(typeof error.detail === "string" ? error.detail : JSON.stringify(error));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function base(workspaceId: string) {
  return `workspaces/${workspaceId}/projects`;
}

export const projectApi = {
  list: (workspaceId: string) => request<Project[]>(base(workspaceId)),

  create: (workspaceId: string, data: CreateProjectInput) =>
    request<Project>(base(workspaceId), "POST", data),

  get: (workspaceId: string, projectId: string) =>
    request<Project>(`${base(workspaceId)}/${projectId}`),

  update: (workspaceId: string, projectId: string, data: UpdateProjectInput) =>
    request<Project>(`${base(workspaceId)}/${projectId}`, "PATCH", data),

  archive: (workspaceId: string, projectId: string) =>
    request<Project>(`${base(workspaceId)}/${projectId}/archive`, "POST"),

  restore: (workspaceId: string, projectId: string) =>
    request<Project>(`${base(workspaceId)}/${projectId}/restore`, "POST"),
};
