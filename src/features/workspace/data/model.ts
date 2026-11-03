export type EntityId = string;

export type WorkStatus = "Backlog" | "To Do" | "In Progress" | "In Review" | "Done" | "Planned";
export type Priority = "Urgent" | "High" | "Medium" | "Low";
export type ProjectStatus = "In Progress" | "Planning" | "In Review" | "Archived";
export type MemberRole = "Owner" | "Admin" | "Project lead" | "Member" | "Viewer";
export type WorkspaceTeamSize = "1–10" | "11–50" | "51–200" | "200+";
export type WorkspaceIndustry =
  | "Product & Engineering"
  | "Design Agency & Creative Labs"
  | "SaaS Enterprise Platform"
  | "Fintech & Regulated Systems";

export interface Workspace {
  id: EntityId;
  name: string;
  slug: string;
  plan: "Free" | "Pro" | "Team" | "Enterprise";
  teamSize?: WorkspaceTeamSize;
  industry?: WorkspaceIndustry;
  memberIds: EntityId[];
  projectIds: EntityId[];
  createdAt: string;
}

export interface Member {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  email: string;
  team: string;
  role: MemberRole;
  presence: "Online" | "Away" | "Offline";
}

export interface Project {
  id: EntityId;
  workspaceId: EntityId;
  key: string;
  name: string;
  description: string;
  category: string;
  status: ProjectStatus;
  progress: number;
  leadId: EntityId;
  memberIds: EntityId[];
  dueDate: string;
  color: string;
  archivedAt?: string;
}

export interface Issue {
  id: EntityId;
  key: string;
  workspaceId: EntityId;
  projectId: EntityId;
  title: string;
  description: string;
  status: WorkStatus;
  priority: Priority;
  assigneeId: EntityId | null;
  reporterId: EntityId;
  dueDate: string | null;
  storyPoints: number;
  sprintId: EntityId | null;
  labels: string[];
  subtaskIds: EntityId[];
  commentIds: EntityId[];
  blockedByIds: EntityId[];
  blocksIds: EntityId[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: EntityId;
  issueId: EntityId;
  title: string;
  completed: boolean;
  assigneeId: EntityId | null;
}

export interface IssueComment {
  id: EntityId;
  issueId: EntityId;
  authorId: EntityId;
  body: string;
  createdAt: string;
}

export interface Sprint {
  id: EntityId;
  workspaceId: EntityId;
  projectId: EntityId;
  name: string;
  goal: string;
  status: "Planned" | "Active" | "Closed";
  startDate: string;
  endDate: string;
  capacityPoints: number;
  completedAt: string | null;
}

export type NotificationCategory = "Assigned to Me" | "Mentions" | "Comments" | "System & Sprints";
export interface WorkspaceNotification {
  id: EntityId;
  workspaceId: EntityId;
  recipientId: EntityId;
  category: NotificationCategory;
  actorId: EntityId | null;
  issueId: EntityId | null;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface WorkspaceSettings {
  methodology: "Agile Scrum" | "Kanban" | "Custom";
  sprintLengthDays: number;
  statuses: WorkStatus[];
  issueFields: string[];
  automationRules: Array<{ id: string; name: string; enabled: boolean; successRate: number }>;
  security: { mfaRequired: boolean; allowedRegions: string[]; sessionTimeoutMinutes: number };
}

export interface DemoState {
  version: 1;
  activeWorkspaceId: EntityId;
  activeMemberId: EntityId;
  workspaces: Workspace[];
  members: Member[];
  projects: Project[];
  issues: Issue[];
  subtasks: Subtask[];
  comments: IssueComment[];
  sprints: Sprint[];
  notifications: WorkspaceNotification[];
  settingsByWorkspace: Record<EntityId, WorkspaceSettings>;
  counters: {
    issue: number;
    project: number;
    workspace: number;
    sprint: number;
    comment: number;
    subtask: number;
  };
}

export interface CreateIssueInput {
  workspaceId?: EntityId;
  projectId: EntityId;
  title: string;
  description?: string;
  status?: WorkStatus;
  priority?: Priority;
  assigneeId?: EntityId | null;
  dueDate?: string | null;
  storyPoints?: number;
  sprintId?: EntityId | null;
  labels?: string[];
  subtasks?: string[];
  reporterId?: EntityId;
}
