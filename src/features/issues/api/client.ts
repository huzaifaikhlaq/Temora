
export type IssueType = "story" | "task" | "bug" | "epic";

export type IssueStatus =
  | "backlog"
  | "to_do"
  | "in_progress"
  | "in_review"
  | "done";

export type IssuePriority = "urgent" | "high" | "medium" | "low";

export interface IssueAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

export interface IssueSubtask {
  id: string;
  key: string;
  title: string;
  status: IssueStatus;
  assignee_id: string | null;
  story_points: number | null;
}

export interface Issue {
  id: string;
  workspace_id: string;
  project_id: string;
  number: number;
  key: string;

  issue_type: IssueType;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;

  assignee_id: string | null;
  reporter_id: string;
  sprint_id: string | null;
  story_points: number | null;
  epic_id: string | null;
  parent_id: string | null;

  components: string[];
  tags: string[];
  due_date: string | null;
  is_draft: boolean;
  archived_at: string | null;

  created_at: string;
  updated_at: string;

  subtasks: IssueSubtask[];
  subtasks_completed: number;
  attachments: IssueAttachment[];
}

export type IssueInput = Partial<
  Pick<
    Issue,
    | "issue_type"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "assignee_id"
    | "sprint_id"
    | "story_points"
    | "epic_id"
    | "parent_id"
    | "components"
    | "tags"
    | "due_date"
    | "is_draft"
  >
> & {
  subtasks?: {
    title: string;
    status: IssueStatus;
  }[];
};

const base = (workspaceId: string, projectId: string) =>
  `/api/issue/workspaces/${workspaceId}/projects/${projectId}/issues`;

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({
    detail: "Invalid response",
  }));

  if (!response.ok) {
    const message =
      typeof payload.detail === "string"
        ? payload.detail
        : JSON.stringify(payload);

    throw new Error(message);
  }

  return payload as T;
}

async function send<T>(
  url: string,
  method = "GET",
  data?: IssueInput,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  return parse<T>(response);
}

export const issueApi = {
  list: (workspaceId: string, projectId: string, query = "") =>
    send<Issue[]>(
      `${base(workspaceId, projectId)}${query ? `?${query}` : ""}`,
    ),

  create: (
    workspaceId: string,
    projectId: string,
    input: IssueInput,
  ) =>
    send<Issue>(
      base(workspaceId, projectId),
      "POST",
      input,
    ),

  get: (
    workspaceId: string,
    projectId: string,
    issueId: string,
  ) =>
    send<Issue>(
      `${base(workspaceId, projectId)}/${issueId}`,
    ),

  update: (
    workspaceId: string,
    projectId: string,
    issueId: string,
    input: IssueInput,
  ) =>
    send<Issue>(
      `${base(workspaceId, projectId)}/${issueId}`,
      "PATCH",
      input,
    ),

  remove: (
    workspaceId: string,
    projectId: string,
    issueId: string,
  ) =>
    send<void>(
      `${base(workspaceId, projectId)}/${issueId}`,
      "DELETE",
    ),

  upload: async (
    workspaceId: string,
    projectId: string,
    issueId: string,
    file: File,
  ) => {
    const form = new FormData();
    form.append("file", file);

    const response = await fetch(
      `${base(workspaceId, projectId)}/${issueId}/attachments`,
      {
        method: "POST",
        body: form,
        cache: "no-store",
        credentials: "same-origin",
      },
    );

    return parse<IssueAttachment>(response);
  },

  attachmentUrl: (
    workspaceId: string,
    projectId: string,
    issueId: string,
    attachmentId: string,
  ) =>
    `${base(workspaceId, projectId)}/${issueId}/attachments/${attachmentId}`,
};
