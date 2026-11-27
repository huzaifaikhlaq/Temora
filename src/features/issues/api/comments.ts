export interface IssueComment {
  id: string;
  issue_id: string;

  author_id: string;
  author_name: string;

  body: string;

  mentioned_user_ids: string[];

  created_at: string;
  updated_at: string;
  edited_at: string | null;

  can_edit: boolean;
  can_delete: boolean;
}

export interface MentionMember {
  id: string;
  username: string;
  full_name: string;
}

export interface CommentListResponse {
  count: number;

  has_next: boolean;
  has_previous: boolean;

  can_comment: boolean;

  members: MentionMember[];

  results: IssueComment[];
}

const base = (workspaceId: string, projectId: string, issueId: string) =>
  `/api/issue/workspaces/${workspaceId}` + `/projects/${projectId}/issues/${issueId}/comments`;

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,

    credentials: "same-origin",

    cache: "no-store",

    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({
    detail: "Invalid response",
  }));

  if (!response.ok) {
    const error = typeof data.detail === "string" ? data.detail : JSON.stringify(data);

    throw new Error(error);
  }

  return data as T;
}

export const commentsApi = {
  list(workspaceId: string, projectId: string, issueId: string, page = 1, signal?: AbortSignal) {
    return request<CommentListResponse>(`${base(workspaceId, projectId, issueId)}?page=${page}`, {
      signal,
    });
  },

  create(workspaceId: string, projectId: string, issueId: string, body: string) {
    return request<IssueComment>(base(workspaceId, projectId, issueId), {
      method: "POST",

      body: JSON.stringify({ body }),
    });
  },

  update(workspaceId: string, projectId: string, issueId: string, commentId: string, body: string) {
    return request<IssueComment>(`${base(workspaceId, projectId, issueId)}/${commentId}`, {
      method: "PATCH",

      body: JSON.stringify({ body }),
    });
  },

  remove(workspaceId: string, projectId: string, issueId: string, commentId: string) {
    return request<void>(`${base(workspaceId, projectId, issueId)}/${commentId}`, {
      method: "DELETE",
    });
  },
};
