
export type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: WorkspaceRole;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}
