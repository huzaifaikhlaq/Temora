import { addDays, createInitialDemoState, DEMO_TODAY } from "@/features/workspace/data/seed";
import type {
  CreateIssueInput,
  DemoState,
  EntityId,
  Issue,
  Member,
  Project,
  ProjectStatus,
  RetrospectiveNote,
  Sprint,
  Workspace,
  WorkspaceIndustry,
  WorkspaceSettings,
  WorkspaceTeamSize,
} from "@/features/workspace/data/model";

const STORAGE_KEY = "temora-demo-state-v1";
const initialState = createInitialDemoState();
let state = initialState;
let hydrated = false;
const listeners = new Set<() => void>();

function persist(next: DemoState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current session usable if browser storage is disabled or full.
    }
  }
  listeners.forEach((listener) => listener());
}

function nextId(prefix: string, count: number): string {
  return `${prefix}-${count + 1}`;
}

function scopedWorkspace(workspaceId = state.activeWorkspaceId): Workspace {
  const workspace = state.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) throw new Error("Workspace not found.");
  return workspace;
}

export const demoRepository = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => initialState,

  hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      if (isDemoState(parsed)) {
        state = parsed;
        listeners.forEach((listener) => listener());
      }
    } catch {
      // Invalid demo data is ignored; the bundled seed remains available.
    }
  },

  resetDemo() {
    hydrated = true;
    persist(createInitialDemoState());
  },

  switchWorkspace(workspaceId: EntityId) {
    scopedWorkspace(workspaceId);
    persist({ ...state, activeWorkspaceId: workspaceId });
  },

  createWorkspace(input: {
    name: string;
    slug?: string;
    plan?: Workspace["plan"];
    teamSize?: WorkspaceTeamSize;
    industry?: WorkspaceIndustry;
    methodology?: WorkspaceSettings["methodology"];
  }) {
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Enter a workspace name with at least two characters.");
    const slug = slugify(input.slug ?? name);
    if (!slug) throw new Error("Enter a workspace URL using letters, numbers, and hyphens.");
    if (state.workspaces.some((workspace) => workspace.slug === slug))
      throw new Error("That workspace URL is already in use in this demo.");
    const id = nextId("workspace", state.counters.workspace);
    const owner = state.members.find((member) => member.id === state.activeMemberId);
    if (!owner) throw new Error("Choose a workspace owner before creating a workspace.");
    const memberId = `${id}-owner`;
    const member = { ...owner, id: memberId, workspaceId: id, role: "Owner" as const };
    const workspace: Workspace = {
      id,
      name,
      slug,
      plan: input.plan ?? "Free",
      ...(input.teamSize ? { teamSize: input.teamSize } : {}),
      ...(input.industry ? { industry: input.industry } : {}),
      memberIds: [memberId],
      projectIds: [],
      createdAt: DEMO_TODAY,
    };
    persist({
      ...state,
      workspaces: [...state.workspaces, workspace],
      members: [...state.members, member],
      settingsByWorkspace: {
        ...state.settingsByWorkspace,
        [id]: { ...defaultSettings(), methodology: input.methodology ?? "Agile Scrum" },
      },
      activeWorkspaceId: id,
      activeMemberId: memberId,
      counters: { ...state.counters, workspace: state.counters.workspace + 1 },
    });
    return workspace;
  },

  updateWorkspace(workspaceId: EntityId, patch: Partial<Pick<Workspace, "name" | "plan">>) {
    scopedWorkspace(workspaceId);
    const name = patch.name?.trim();
    if (patch.name !== undefined && (!name || name.length < 2))
      throw new Error("Workspace name must have at least two characters.");
    persist({
      ...state,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, ...patch, ...(name ? { name } : {}) }
          : workspace,
      ),
    });
  },

  createProject(input: {
    workspaceId?: EntityId;
    name: string;
    description?: string;
    category?: string;
    leadId?: EntityId;
  }) {
    const workspaceId = input.workspaceId ?? state.activeWorkspaceId;
    const workspace = scopedWorkspace(workspaceId);
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Project name must have at least two characters.");
    const id = slugify(name) || nextId("project", state.counters.project);
    if (state.projects.some((project) => project.workspaceId === workspaceId && project.id === id))
      throw new Error("A project with this name already exists in this workspace.");
    const leadId = input.leadId ?? state.activeMemberId;
    if (!workspace.memberIds.includes(leadId))
      throw new Error("The project lead must belong to the active workspace.");
    const project: Project = {
      id,
      workspaceId,
      key: projectKey(name),
      name,
      description: input.description?.trim() ?? "",
      category: input.category?.trim() || "General",
      status: "Planning",
      progress: 0,
      leadId,
      memberIds: [leadId],
      dueDate: addDays(DEMO_TODAY, 30),
      color: "bg-accent",
    };
    persist({
      ...state,
      projects: [...state.projects, project],
      workspaces: state.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, projectIds: [...item.projectIds, id] } : item,
      ),
      counters: { ...state.counters, project: state.counters.project + 1 },
    });
    return project;
  },

  updateProject(
    projectId: EntityId,
    patch: Partial<
      Pick<
        Project,
        | "name"
        | "description"
        | "category"
        | "status"
        | "progress"
        | "leadId"
        | "dueDate"
        | "memberIds"
      >
    >,
  ) {
    const project = findProject(projectId);
    if (patch.name !== undefined && patch.name.trim().length < 2)
      throw new Error("Project name must have at least two characters.");
    if (patch.progress !== undefined && (patch.progress < 0 || patch.progress > 100))
      throw new Error("Project progress must be between 0 and 100.");
    if (patch.leadId && !scopedWorkspace(project.workspaceId).memberIds.includes(patch.leadId))
      throw new Error("The project lead must belong to the project workspace.");
    persist({
      ...state,
      projects: state.projects.map((item) =>
        item.id === projectId
          ? { ...item, ...patch, ...(patch.name ? { name: patch.name.trim() } : {}) }
          : item,
      ),
    });
  },

  archiveProject(projectId: EntityId) {
    const project = findProject(projectId);
    const archivedAt = DEMO_TODAY;
    persist({
      ...state,
      projects: state.projects.map((item) =>
        item.id === projectId ? { ...item, status: "Archived" as ProjectStatus, archivedAt } : item,
      ),
    });
    return project;
  },

  restoreProject(projectId: EntityId) {
    findProject(projectId);
    persist({
      ...state,
      projects: state.projects.map((item) =>
        item.id === projectId
          ? { ...item, status: "Planning" as const, archivedAt: undefined }
          : item,
      ),
    });
  },

  createIssue(input: CreateIssueInput) {
    const workspaceId = input.workspaceId ?? state.activeWorkspaceId;
    const project = state.projects.find(
      (item) =>
        item.id === input.projectId &&
        item.workspaceId === workspaceId &&
        item.status !== "Archived",
    );
    if (!project) throw new Error("Choose an active project in this workspace.");
    const title = input.title.trim();
    if (title.length < 3) throw new Error("Issue summary must have at least three characters.");
    const id = `TEM-${state.counters.issue + 1}`;
    const issue: Issue = {
      id,
      key: id,
      workspaceId,
      projectId: project.id,
      title,
      description: input.description?.trim() ?? "",
      status: input.status ?? "Backlog",
      priority: input.priority ?? "Medium",
      assigneeId: input.assigneeId ?? null,
      reporterId: input.reporterId ?? state.activeMemberId,
      dueDate: input.dueDate ?? null,
      storyPoints: input.storyPoints ?? 0,
      sprintId: input.sprintId ?? null,
      labels: input.labels ?? [],
      subtaskIds: [],
      commentIds: [],
      blockedByIds: [],
      blocksIds: [],
      createdAt: DEMO_TODAY,
      updatedAt: DEMO_TODAY,
    };
    let next = {
      ...state,
      issues: [...state.issues, issue],
      counters: { ...state.counters, issue: state.counters.issue + 1 },
    };
    for (const title of input.subtasks ?? []) next = addSubtaskTo(next, issue.id, title, null);
    persist(next);
    return issue;
  },

  updateIssue(
    issueId: EntityId,
    patch: Partial<
      Pick<
        Issue,
        | "title"
        | "description"
        | "status"
        | "priority"
        | "assigneeId"
        | "dueDate"
        | "storyPoints"
        | "sprintId"
        | "labels"
      >
    >,
  ) {
    const issue = findIssue(issueId);
    if (patch.title !== undefined && patch.title.trim().length < 3)
      throw new Error("Issue summary must have at least three characters.");
    if (patch.storyPoints !== undefined && patch.storyPoints < 0)
      throw new Error("Story points cannot be negative.");
    if (
      patch.assigneeId &&
      !scopedWorkspace(issue.workspaceId).memberIds.includes(patch.assigneeId)
    )
      throw new Error("Assignee must belong to this workspace.");
    persist({
      ...state,
      issues: state.issues.map((item) =>
        item.id === issueId
          ? {
              ...item,
              ...patch,
              ...(patch.title ? { title: patch.title.trim() } : {}),
              updatedAt: DEMO_TODAY,
            }
          : item,
      ),
    });
  },

  addIssueDependency(
    issueId: EntityId,
    relatedIssueId: EntityId,
    relation: "blocks" | "blocked-by" | "relates-to",
  ) {
    const issue = findIssue(issueId);
    const related = findIssue(relatedIssueId);
    if (issue.id === related.id) throw new Error("An issue cannot depend on itself.");
    if (issue.workspaceId !== related.workspaceId)
      throw new Error("Dependencies must stay within the active workspace.");
    if (relation === "relates-to") {
      if (issue.relatedIds?.includes(related.id) || related.relatedIds?.includes(issue.id))
        throw new Error("These issues are already related.");
      persist({
        ...state,
        issues: state.issues.map((item) =>
          item.id === issue.id
            ? {
                ...item,
                relatedIds: [...(item.relatedIds ?? []), related.id],
                updatedAt: DEMO_TODAY,
              }
            : item.id === related.id
              ? {
                  ...item,
                  relatedIds: [...(item.relatedIds ?? []), issue.id],
                  updatedAt: DEMO_TODAY,
                }
              : item,
        ),
      });
      return;
    }
    const blocker = relation === "blocks" ? issue : related;
    const blocked = relation === "blocks" ? related : issue;
    if (blocker.blocksIds.includes(blocked.id)) throw new Error("This dependency already exists.");

    const reachesBlocker = (startId: EntityId, visited = new Set<EntityId>()): boolean => {
      if (startId === blocker.id) return true;
      if (visited.has(startId)) return false;
      visited.add(startId);
      const current = state.issues.find((item) => item.id === startId);
      return current?.blocksIds.some((nextId) => reachesBlocker(nextId, visited)) ?? false;
    };
    if (reachesBlocker(blocked.id)) throw new Error("This dependency would create a cycle.");

    persist({
      ...state,
      issues: state.issues.map((item) => {
        if (item.id === blocker.id)
          return { ...item, blocksIds: [...item.blocksIds, blocked.id], updatedAt: DEMO_TODAY };
        if (item.id === blocked.id)
          return {
            ...item,
            blockedByIds: [...item.blockedByIds, blocker.id],
            updatedAt: DEMO_TODAY,
          };
        return item;
      }),
    });
  },

  removeIssueDependency(
    issueId: EntityId,
    relatedIssueId: EntityId,
    relation: "blocks" | "blocked-by" | "relates-to",
  ) {
    const issue = findIssue(issueId);
    const related = findIssue(relatedIssueId);
    if (issue.workspaceId !== related.workspaceId)
      throw new Error("Dependencies must stay within the active workspace.");
    if (relation === "relates-to") {
      if (!issue.relatedIds?.includes(related.id) || !related.relatedIds?.includes(issue.id))
        throw new Error("These issues are not related.");
      persist({
        ...state,
        issues: state.issues.map((item) =>
          item.id === issue.id
            ? {
                ...item,
                relatedIds: item.relatedIds?.filter((id) => id !== related.id),
                updatedAt: DEMO_TODAY,
              }
            : item.id === related.id
              ? {
                  ...item,
                  relatedIds: item.relatedIds?.filter((id) => id !== issue.id),
                  updatedAt: DEMO_TODAY,
                }
              : item,
        ),
      });
      return;
    }
    const blocker = relation === "blocks" ? issue : related;
    const blocked = relation === "blocks" ? related : issue;
    if (!blocker.blocksIds.includes(blocked.id)) throw new Error("This dependency does not exist.");
    persist({
      ...state,
      issues: state.issues.map((item) => {
        if (item.id === blocker.id)
          return {
            ...item,
            blocksIds: item.blocksIds.filter((id) => id !== blocked.id),
            updatedAt: DEMO_TODAY,
          };
        if (item.id === blocked.id)
          return {
            ...item,
            blockedByIds: item.blockedByIds.filter((id) => id !== blocker.id),
            updatedAt: DEMO_TODAY,
          };
        return item;
      }),
    });
  },

  deleteIssue(issueId: EntityId) {
    findIssue(issueId);
    persist({
      ...state,
      issues: state.issues
        .filter((item) => item.id !== issueId)
        .map((item) => ({
          ...item,
          blockedByIds: item.blockedByIds.filter((id) => id !== issueId),
          blocksIds: item.blocksIds.filter((id) => id !== issueId),
          relatedIds: item.relatedIds?.filter((id) => id !== issueId),
        })),
      subtasks: state.subtasks.filter((item) => item.issueId !== issueId),
      comments: state.comments.filter((item) => item.issueId !== issueId),
      notifications: state.notifications.filter((item) => item.issueId !== issueId),
    });
  },

  addSubtask(issueId: EntityId, title: string) {
    const next = addSubtaskTo(state, issueId, title, state.activeMemberId);
    persist(next);
    return next.subtasks[next.subtasks.length - 1];
  },

  updateSubtask(
    subtaskId: EntityId,
    patch: Partial<Pick<DemoState["subtasks"][number], "title" | "completed" | "assigneeId">>,
  ) {
    const subtask = state.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) throw new Error("Subtask not found.");
    const title = patch.title?.trim();
    if (patch.title !== undefined && !title) throw new Error("Subtask title cannot be empty.");
    persist({
      ...state,
      subtasks: state.subtasks.map((item) =>
        item.id === subtaskId ? { ...item, ...patch, ...(title ? { title } : {}) } : item,
      ),
    });
  },

  deleteSubtask(subtaskId: EntityId) {
    const subtask = state.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return;
    persist({
      ...state,
      subtasks: state.subtasks.filter((item) => item.id !== subtaskId),
      issues: state.issues.map((issue) =>
        issue.id === subtask.issueId
          ? { ...issue, subtaskIds: issue.subtaskIds.filter((id) => id !== subtaskId) }
          : issue,
      ),
    });
  },

  addComment(issueId: EntityId, body: string) {
    const issue = findIssue(issueId);
    const text = body.trim();
    if (!text) throw new Error("Comment cannot be empty.");
    const id = nextId("comment", state.counters.comment);
    const comment = {
      id,
      issueId,
      authorId: state.activeMemberId,
      body: text,
      createdAt: DEMO_TODAY,
    };
    persist({
      ...state,
      comments: [...state.comments, comment],
      issues: state.issues.map((item) =>
        item.id === issueId
          ? { ...item, commentIds: [...item.commentIds, id], updatedAt: DEMO_TODAY }
          : item,
      ),
      counters: { ...state.counters, comment: state.counters.comment + 1 },
    });
    return issue;
  },

  createSprint(input: {
    projectId: EntityId;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    capacityPoints?: number;
  }) {
    const project = findProject(input.projectId);
    if (!input.name.trim()) throw new Error("Sprint name is required.");
    if (input.endDate < input.startDate)
      throw new Error("Sprint end date must be after the start date.");
    const id = nextId("sprint", state.counters.sprint);
    const sprint: Sprint = {
      id,
      workspaceId: project.workspaceId,
      projectId: project.id,
      name: input.name.trim(),
      goal: input.goal.trim(),
      status: "Planned",
      startDate: input.startDate,
      endDate: input.endDate,
      capacityPoints: input.capacityPoints ?? 40,
      completedAt: null,
    };
    persist({
      ...state,
      sprints: [...state.sprints, sprint],
      counters: { ...state.counters, sprint: state.counters.sprint + 1 },
    });
    return sprint;
  },

  updateSprint(
    sprintId: EntityId,
    patch: Partial<Pick<Sprint, "name" | "goal" | "startDate" | "endDate" | "capacityPoints">>,
  ) {
    const sprint = state.sprints.find((item) => item.id === sprintId);
    if (!sprint) throw new Error("Sprint not found.");
    if (patch.startDate && patch.endDate && patch.endDate < patch.startDate)
      throw new Error("Sprint end date must be after the start date.");
    persist({
      ...state,
      sprints: state.sprints.map((item) => (item.id === sprintId ? { ...item, ...patch } : item)),
    });
  },

  startSprint(sprintId: EntityId) {
    const sprint = state.sprints.find((item) => item.id === sprintId);
    if (!sprint) throw new Error("Sprint not found.");
    if (
      state.sprints.some(
        (item) =>
          item.projectId === sprint.projectId && item.status === "Active" && item.id !== sprintId,
      )
    )
      throw new Error("Complete the active sprint before starting another.");
    persist({
      ...state,
      sprints: state.sprints.map((item) =>
        item.id === sprintId ? { ...item, status: "Active" } : item,
      ),
    });
  },

  completeSprint(sprintId: EntityId, destinationSprintId: EntityId | null) {
    const sprint = state.sprints.find((item) => item.id === sprintId);
    if (!sprint || sprint.status !== "Active")
      throw new Error("Only an active sprint can be completed.");
    if (destinationSprintId) {
      const destination = state.sprints.find(
        (item) =>
          item.id === destinationSprintId &&
          item.projectId === sprint.projectId &&
          item.id !== sprintId,
      );
      if (!destination) throw new Error("Choose a destination sprint in the same project.");
    }
    const issues = state.issues.map((issue) =>
      issue.sprintId === sprintId && issue.status !== "Done"
        ? {
            ...issue,
            sprintId: destinationSprintId,
            status: destinationSprintId ? issue.status : ("Backlog" as const),
          }
        : issue,
    );
    persist({
      ...state,
      issues,
      sprints: state.sprints.map((item) =>
        item.id === sprintId ? { ...item, status: "Closed", completedAt: DEMO_TODAY } : item,
      ),
    });
  },

  inviteMember(input: { email: string; name?: string; role?: Member["role"] }) {
    const email = input.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
    const workspace = scopedWorkspace();
    if (
      state.members.some(
        (member) => member.workspaceId === workspace.id && member.email.toLowerCase() === email,
      )
    )
      throw new Error("This member already belongs to the workspace.");
    const id = `invite-${state.members.length + 1}`;
    const member: Member = {
      id,
      workspaceId: workspace.id,
      name: input.name?.trim() || email.split("@")[0],
      email,
      team: "Invited",
      role: input.role ?? "Member",
      presence: "Offline",
    };
    persist({
      ...state,
      members: [...state.members, member],
      workspaces: state.workspaces.map((item) =>
        item.id === workspace.id ? { ...item, memberIds: [...item.memberIds, id] } : item,
      ),
    });
    return member;
  },

  updateMemberRole(memberId: EntityId, role: Member["role"]) {
    const member = state.members.find(
      (item) => item.id === memberId && item.workspaceId === state.activeWorkspaceId,
    );
    if (!member) throw new Error("Member is not in the active workspace.");
    if (member.role === "Owner" && role !== "Owner")
      throw new Error("Transfer workspace ownership before changing the owner role.");
    persist({
      ...state,
      members: state.members.map((item) => (item.id === memberId ? { ...item, role } : item)),
    });
  },

  setNotificationRead(notificationId: EntityId, read: boolean) {
    persist({
      ...state,
      notifications: state.notifications.map((item) =>
        item.id === notificationId && item.workspaceId === state.activeWorkspaceId
          ? { ...item, readAt: read ? DEMO_TODAY : null }
          : item,
      ),
    });
  },

  markAllNotificationsRead() {
    persist({
      ...state,
      notifications: state.notifications.map((item) =>
        item.workspaceId === state.activeWorkspaceId && item.recipientId === state.activeMemberId
          ? { ...item, readAt: item.readAt ?? DEMO_TODAY }
          : item,
      ),
    });
  },

  updateSettings(patch: Partial<WorkspaceSettings>) {
    const workspace = scopedWorkspace();
    const current = state.settingsByWorkspace[workspace.id] ?? defaultSettings();
    persist({
      ...state,
      settingsByWorkspace: {
        ...state.settingsByWorkspace,
        [workspace.id]: { ...current, ...patch },
      },
    });
  },

  addRetrospectiveNote(sprintId: EntityId, category: RetrospectiveNote["category"], body: string) {
    const workspace = scopedWorkspace();
    const sprint = state.sprints.find(
      (item) => item.id === sprintId && item.workspaceId === workspace.id,
    );
    if (!sprint) throw new Error("Sprint is not available in the active workspace.");
    const text = body.trim();
    if (text.length < 3 || text.length > 500)
      throw new Error("Retrospective notes must be between 3 and 500 characters.");
    const current = state.settingsByWorkspace[workspace.id] ?? defaultSettings();
    const notes = current.retrospectiveNotes?.[sprintId] ?? [];
    const totalNotes = Object.values(state.settingsByWorkspace).reduce(
      (total, item) => total + Object.values(item.retrospectiveNotes ?? {}).flat().length,
      0,
    );
    const note: RetrospectiveNote = {
      id: nextId("retro-note", totalNotes),
      sprintId,
      category,
      body: text,
      votes: [],
      createdAt: DEMO_TODAY,
    };
    persist({
      ...state,
      settingsByWorkspace: {
        ...state.settingsByWorkspace,
        [workspace.id]: {
          ...current,
          retrospectiveNotes: {
            ...current.retrospectiveNotes,
            [sprintId]: [...notes, note],
          },
        },
      },
    });
    return note;
  },

  toggleRetrospectiveVote(noteId: EntityId) {
    const workspace = scopedWorkspace();
    const current = state.settingsByWorkspace[workspace.id] ?? defaultSettings();
    let changed = false;
    const retrospectiveNotes = Object.fromEntries(
      Object.entries(current.retrospectiveNotes ?? {}).map(([sprintId, notes]) => [
        sprintId,
        notes.map((note) => {
          if (note.id !== noteId) return note;
          changed = true;
          const hasVoted = note.votes.includes(state.activeMemberId);
          return {
            ...note,
            votes: hasVoted
              ? note.votes.filter((memberId) => memberId !== state.activeMemberId)
              : [...note.votes, state.activeMemberId],
          };
        }),
      ]),
    );
    if (!changed) throw new Error("Retrospective note not found in the active workspace.");
    persist({
      ...state,
      settingsByWorkspace: {
        ...state.settingsByWorkspace,
        [workspace.id]: { ...current, retrospectiveNotes },
      },
    });
  },

  deleteRetrospectiveNote(noteId: EntityId) {
    const workspace = scopedWorkspace();
    const current = state.settingsByWorkspace[workspace.id] ?? defaultSettings();
    const found = Object.values(current.retrospectiveNotes ?? {})
      .flat()
      .some((note) => note.id === noteId);
    if (!found) throw new Error("Retrospective note not found in the active workspace.");
    const retrospectiveNotes = Object.fromEntries(
      Object.entries(current.retrospectiveNotes ?? {}).map(([sprintId, notes]) => [
        sprintId,
        notes.filter((note) => note.id !== noteId),
      ]),
    );
    persist({
      ...state,
      settingsByWorkspace: {
        ...state.settingsByWorkspace,
        [workspace.id]: { ...current, retrospectiveNotes },
      },
    });
  },
};

function addSubtaskTo(
  current: DemoState,
  issueId: EntityId,
  title: string,
  assigneeId: EntityId | null,
): DemoState {
  const issue = current.issues.find((item) => item.id === issueId);
  if (!issue) throw new Error("Issue not found.");
  const text = title.trim();
  if (!text) throw new Error("Subtask title cannot be empty.");
  const id = nextId("subtask", current.counters.subtask);
  return {
    ...current,
    subtasks: [...current.subtasks, { id, issueId, title: text, completed: false, assigneeId }],
    issues: current.issues.map((item) =>
      item.id === issueId ? { ...item, subtaskIds: [...item.subtaskIds, id] } : item,
    ),
    counters: { ...current.counters, subtask: current.counters.subtask + 1 },
  };
}

function findProject(projectId: EntityId) {
  const project = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  if (!project) throw new Error("Project not found in the active workspace.");
  return project;
}

function findIssue(issueId: EntityId) {
  const issue = state.issues.find(
    (item) =>
      (item.id === issueId || item.key === issueId) && item.workspaceId === state.activeWorkspaceId,
  );
  if (!issue) throw new Error("Issue not found in the active workspace.");
  return issue;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function projectKey(value: string) {
  const key = value
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .replace(/[^a-z]/gi, "")
    .toUpperCase();
  return key.slice(0, 4) || "PRJ";
}

function defaultSettings(): WorkspaceSettings {
  return {
    methodology: "Agile Scrum",
    sprintLengthDays: 14,
    statuses: ["Backlog", "To Do", "In Progress", "In Review", "Done"],
    issueFields: ["Story points", "Labels", "Due date"],
    automationRules: [],
    security: {
      mfaRequired: true,
      allowedRegions: ["US-West", "US-East"],
      sessionTimeoutMinutes: 30,
    },
  };
}

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return (
    candidate.version === 1 &&
    typeof candidate.activeWorkspaceId === "string" &&
    Array.isArray(candidate.workspaces) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.issues) &&
    Array.isArray(candidate.members) &&
    Array.isArray(candidate.sprints) &&
    Array.isArray(candidate.subtasks) &&
    Array.isArray(candidate.comments) &&
    Array.isArray(candidate.notifications) &&
    !!candidate.settingsByWorkspace &&
    !!candidate.counters
  );
}
