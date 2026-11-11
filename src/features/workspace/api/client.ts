import type { Workspace, WorkspaceMember, WorkspaceInvitation, WorkspaceRole } from "../types";

const BASE = "/api/workspace";

async function request<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));

    throw new Error(typeof error.detail === "string" ? error.detail : JSON.stringify(error));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const workspaceApi = {
  list: () => request<Workspace[]>("workspaces"),

  create: (name: string) => request<Workspace>("workspaces", "POST", { name }),

  get: (id: string) => request<Workspace>(`workspaces/${id}`),

  update: (id: string, name: string) => request<Workspace>(`workspaces/${id}`, "PATCH", { name }),

  remove: (id: string) => request<void>(`workspaces/${id}`, "DELETE"),

  members: (id: string) => request<WorkspaceMember[]>(`workspaces/${id}/members`),

  updateRole: (workspaceId: string, memberId: string, role: Exclude<WorkspaceRole, "owner">) =>
    request<WorkspaceMember>(`workspaces/${workspaceId}/members/${memberId}`, "PATCH", { role }),

  removeMember: (workspaceId: string, memberId: string) =>
    request<void>(`workspaces/${workspaceId}/members/${memberId}`, "DELETE"),

  invitations: (id: string) => request<WorkspaceInvitation[]>(`workspaces/${id}/invitations`),

  invite: (id: string, email: string, role: "admin" | "member" | "viewer") =>
    request<WorkspaceInvitation>(`workspaces/${id}/invitations`, "POST", { email, role }),

  revokeInvitation: (workspaceId: string, invitationId: string) =>
    request<void>(`workspaces/${workspaceId}/invitations/${invitationId}`, "DELETE"),

  acceptInvitation: (token: string) =>
    request<WorkspaceMember>("invitations/accept", "POST", { token }),

  select: (workspace_id: string) =>
    request<{ workspace_id: string }>("selection", "POST", { workspace_id }),

  selected: () => request<{ workspace_id: string | null }>("selection"),

  leave: (id: string) => request<void>(`workspaces/${id}/leave`, "POST", {}),
};