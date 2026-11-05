import { addDays, createInitialDemoState, DEMO_TODAY } from "@/features/workspace/data/seed";
import type {
  CreateTaskInput,
  DemoState,
  EntityId,
  Task,
  Member,
  Project,
  ProjectStatus,
  RetrospectiveNote,
  Sprint,
  WorkStatus,
  Workspace,
  WorkspaceIndustry,
  WorkspaceSettings,
  WorkspaceTeamSize,
} from "@/features/workspace/data/model";

const STORAGE_KEY = "temora-demo-state-v2";
const LEGACY_STORAGE_KEY = "temora-demo-state-v1";
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
    window.addEventListener("storage", (event) => {
      if (![STORAGE_KEY, LEGACY_STORAGE_KEY].includes(event.key ?? "") || !event.newValue) return;
      try {
        const next = migrateDemoState(JSON.parse(event.newValue));
        if (!next) return;
        if (event.key === LEGACY_STORAGE_KEY) {
          persist(next);
        } else {
          state = next;
          listeners.forEach((listener) => listener());
        }
      } catch {
        // A malformed update in another tab does not replace the current state.
      }
    });
    try {
      const current: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      const legacy: unknown = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null");
      const currentState = migrateDemoState(current);
      const legacyState = currentState ? null : migrateDemoState(legacy);
      const restored = currentState ?? legacyState;
      if (restored) {
        state = restored;
        if (legacyState) persist(restored);
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
    const workspace = scopedWorkspace(workspaceId);
    const activeMemberId = workspace.memberIds.includes(state.activeMemberId)
      ? state.activeMemberId
      : workspace.memberIds[0];
    if (!activeMemberId) throw new Error("This workspace has no members to select.");
    persist({ ...state, activeWorkspaceId: workspaceId, activeMemberId });
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
    const workspaceMemberIds = scopedWorkspace(project.workspaceId).memberIds;
    const leadId = patch.leadId ?? project.leadId;
    const memberIds =
      patch.memberIds ??
      (patch.leadId ? [...new Set([...project.memberIds, leadId])] : project.memberIds);
    if (!workspaceMemberIds.includes(leadId))
      throw new Error("The project lead must belong to the project workspace.");
    if (!memberIds.includes(leadId)) throw new Error("The project lead must be a project member.");
    if (memberIds.some((memberId) => !workspaceMemberIds.includes(memberId)))
      throw new Error("Project members must belong to the project workspace.");
    persist({
      ...state,
      projects: state.projects.map((item) =>
        item.id === projectId
          ? {
              ...item,
              ...patch,
              ...(patch.name ? { name: patch.name.trim() } : {}),
              leadId,
              memberIds,
            }
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

  createTask(input: CreateTaskInput) {
    const workspaceId = input.workspaceId ?? state.activeWorkspaceId;
    const project = state.projects.find(
      (item) =>
        item.id === input.projectId &&
        item.workspaceId === workspaceId &&
        item.status !== "Archived",
    );
    if (!project) throw new Error("Choose an active project in this workspace.");
    const title = input.title.trim();
    if (title.length < 3) throw new Error("Task summary must have at least three characters.");
    const workspace = scopedWorkspace(workspaceId);
    const reporterId = input.reporterId ?? state.activeMemberId;
    if (!workspace.memberIds.includes(reporterId))
      throw new Error("Reporter must belong to the selected workspace.");
    if (input.assigneeId && !workspace.memberIds.includes(input.assigneeId))
      throw new Error("Assignee must belong to the selected workspace.");
    if (input.sprintId) {
      const sprint = state.sprints.find(
        (item) =>
          item.id === input.sprintId &&
          item.workspaceId === workspaceId &&
          item.projectId === project.id &&
          item.status !== "Closed",
      );
      if (!sprint) throw new Error("Choose an open sprint in the selected project.");
    }
    const id = `TEM-${state.counters.task + 1}`;
    const task: Task = {
      id,
      key: id,
      workspaceId,
      projectId: project.id,
      title,
      parentTaskId: null,
      description: input.description?.trim() ?? "",
      status: input.status ?? "Backlog",
      priority: input.priority ?? "Medium",
      assigneeId: input.assigneeId ?? null,
      reporterId,
      dueDate: input.dueDate ?? null,
      storyPoints: input.storyPoints ?? 0,
      sprintId: input.sprintId ?? null,
      labels: input.labels ?? [],
      commentIds: [],
      blockedByIds: [],
      blocksIds: [],
      createdAt: DEMO_TODAY,
      updatedAt: DEMO_TODAY,
    };
    let next = {
      ...state,
      tasks: [...state.tasks, task],
      counters: { ...state.counters, task: state.counters.task + 1 },
    };
    for (const title of input.subtasks ?? []) next = addSubtaskTo(next, task.id, title, null);
    persist(next);
    return task;
  },

  updateTask(
    taskId: EntityId,
    patch: Partial<
      Pick<
        Task,
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
    const task = findTask(taskId);
    if (patch.title !== undefined && patch.title.trim().length < 3)
      throw new Error("Task summary must have at least three characters.");
    if (patch.storyPoints !== undefined && patch.storyPoints < 0)
      throw new Error("Story points cannot be negative.");
    if (patch.assigneeId && !scopedWorkspace(task.workspaceId).memberIds.includes(patch.assigneeId))
      throw new Error("Assignee must belong to this workspace.");
    if (patch.sprintId) {
      const sprint = state.sprints.find(
        (item) =>
          item.id === patch.sprintId &&
          item.workspaceId === task.workspaceId &&
          item.projectId === task.projectId &&
          item.status !== "Closed",
      );
      if (!sprint) throw new Error("Choose an open sprint in this task’s project.");
    }
    persist({
      ...state,
      tasks: state.tasks.map((item) =>
        item.id === taskId
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

  addTaskDependency(
    taskId: EntityId,
    relatedTaskId: EntityId,
    relation: "blocks" | "blocked-by" | "relates-to",
  ) {
    const task = findTask(taskId);
    const related = findTask(relatedTaskId);
    if (task.id === related.id) throw new Error("An task cannot depend on itself.");
    if (task.workspaceId !== related.workspaceId)
      throw new Error("Dependencies must stay within the active workspace.");
    if (relation === "relates-to") {
      if (task.relatedIds?.includes(related.id) || related.relatedIds?.includes(task.id))
        throw new Error("These tasks are already related.");
      persist({
        ...state,
        tasks: state.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                relatedIds: [...(item.relatedIds ?? []), related.id],
                updatedAt: DEMO_TODAY,
              }
            : item.id === related.id
              ? {
                  ...item,
                  relatedIds: [...(item.relatedIds ?? []), task.id],
                  updatedAt: DEMO_TODAY,
                }
              : item,
        ),
      });
      return;
    }
    const blocker = relation === "blocks" ? task : related;
    const blocked = relation === "blocks" ? related : task;
    if (blocker.blocksIds.includes(blocked.id)) throw new Error("This dependency already exists.");

    const reachesBlocker = (startId: EntityId, visited = new Set<EntityId>()): boolean => {
      if (startId === blocker.id) return true;
      if (visited.has(startId)) return false;
      visited.add(startId);
      const current = state.tasks.find((item) => item.id === startId);
      return current?.blocksIds.some((nextId) => reachesBlocker(nextId, visited)) ?? false;
    };
    if (reachesBlocker(blocked.id)) throw new Error("This dependency would create a cycle.");

    persist({
      ...state,
      tasks: state.tasks.map((item) => {
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

  removeTaskDependency(
    taskId: EntityId,
    relatedTaskId: EntityId,
    relation: "blocks" | "blocked-by" | "relates-to",
  ) {
    const task = findTask(taskId);
    const related = findTask(relatedTaskId);
    if (task.workspaceId !== related.workspaceId)
      throw new Error("Dependencies must stay within the active workspace.");
    if (relation === "relates-to") {
      if (!task.relatedIds?.includes(related.id) || !related.relatedIds?.includes(task.id))
        throw new Error("These tasks are not related.");
      persist({
        ...state,
        tasks: state.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                relatedIds: item.relatedIds?.filter((id) => id !== related.id),
                updatedAt: DEMO_TODAY,
              }
            : item.id === related.id
              ? {
                  ...item,
                  relatedIds: item.relatedIds?.filter((id) => id !== task.id),
                  updatedAt: DEMO_TODAY,
                }
              : item,
        ),
      });
      return;
    }
    const blocker = relation === "blocks" ? task : related;
    const blocked = relation === "blocks" ? related : task;
    if (!blocker.blocksIds.includes(blocked.id)) throw new Error("This dependency does not exist.");
    persist({
      ...state,
      tasks: state.tasks.map((item) => {
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

  deleteTask(taskId: EntityId) {
    findTask(taskId);
    const deletedTaskIds = new Set([taskId]);
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      for (const task of state.tasks) {
        if (
          task.parentTaskId &&
          deletedTaskIds.has(task.parentTaskId) &&
          !deletedTaskIds.has(task.id)
        ) {
          deletedTaskIds.add(task.id);
          foundChild = true;
        }
      }
    }
    persist({
      ...state,
      tasks: state.tasks
        .filter((item) => !deletedTaskIds.has(item.id))
        .map((item) => ({
          ...item,
          blockedByIds: item.blockedByIds.filter((id) => !deletedTaskIds.has(id)),
          blocksIds: item.blocksIds.filter((id) => !deletedTaskIds.has(id)),
          relatedIds: item.relatedIds?.filter((id) => !deletedTaskIds.has(id)),
        })),
      comments: state.comments.filter((item) => !deletedTaskIds.has(item.taskId)),
      notifications: state.notifications.filter(
        (item) => !item.taskId || !deletedTaskIds.has(item.taskId),
      ),
    });
  },

  addSubtask(taskId: EntityId, title: string) {
    const parent = findTask(taskId);
    if (parent.parentTaskId) throw new Error("Subtasks cannot have their own subtasks.");
    const subtaskId = `TEM-${state.counters.task + 1}`;
    const next = addSubtaskTo(state, taskId, title, state.activeMemberId);
    const subtask = next.tasks.find((item) => item.id === subtaskId);
    if (!subtask) throw new Error("Subtask was not created.");
    persist(next);
    return subtask;
  },

  addComment(taskId: EntityId, body: string) {
    const task = findTask(taskId);
    const text = body.trim();
    if (!text) throw new Error("Comment cannot be empty.");
    const id = nextId("comment", state.counters.comment);
    const comment = {
      id,
      taskId,
      authorId: state.activeMemberId,
      body: text,
      createdAt: DEMO_TODAY,
    };
    persist({
      ...state,
      comments: [...state.comments, comment],
      tasks: state.tasks.map((item) =>
        item.id === taskId
          ? { ...item, commentIds: [...item.commentIds, id], updatedAt: DEMO_TODAY }
          : item,
      ),
      counters: { ...state.counters, comment: state.counters.comment + 1 },
    });
    return task;
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
    if (!input.startDate || !input.endDate) throw new Error("Sprint dates are required.");
    if (input.endDate < input.startDate)
      throw new Error("Sprint end date must be after the start date.");
    if (input.capacityPoints !== undefined && input.capacityPoints < 0)
      throw new Error("Sprint capacity cannot be negative.");
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
    const sprint = findSprint(sprintId);
    const startDate = patch.startDate ?? sprint.startDate;
    const endDate = patch.endDate ?? sprint.endDate;
    if (endDate < startDate) throw new Error("Sprint end date must be after the start date.");
    if (patch.name !== undefined && !patch.name.trim()) throw new Error("Sprint name is required.");
    if (patch.capacityPoints !== undefined && patch.capacityPoints < 0)
      throw new Error("Sprint capacity cannot be negative.");
    persist({
      ...state,
      sprints: state.sprints.map((item) =>
        item.id === sprintId
          ? { ...item, ...patch, ...(patch.name ? { name: patch.name.trim() } : {}) }
          : item,
      ),
    });
  },

  startSprint(sprintId: EntityId) {
    const sprint = findSprint(sprintId);
    if (sprint.status !== "Planned") throw new Error("Only a planned sprint can be started.");
    if (
      state.sprints.some(
        (item) =>
          item.workspaceId === sprint.workspaceId &&
          item.projectId === sprint.projectId &&
          item.status === "Active" &&
          item.id !== sprintId,
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
    const sprint = findSprint(sprintId);
    if (!sprint || sprint.status !== "Active")
      throw new Error("Only an active sprint can be completed.");
    if (destinationSprintId) {
      const destination = state.sprints.find(
        (item) =>
          item.id === destinationSprintId &&
          item.workspaceId === sprint.workspaceId &&
          item.projectId === sprint.projectId &&
          item.id !== sprintId,
      );
      if (!destination) throw new Error("Choose a destination sprint in the same project.");
    }
    const tasks = state.tasks.map((task) =>
      task.sprintId === sprintId && task.status !== "Done"
        ? {
            ...task,
            sprintId: destinationSprintId,
            status: destinationSprintId ? task.status : ("Backlog" as const),
          }
        : task,
    );
    persist({
      ...state,
      tasks,
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

  updateMemberProfile(memberId: EntityId, patch: Pick<Member, "name" | "email">) {
    const member = state.members.find(
      (item) => item.id === memberId && item.workspaceId === state.activeWorkspaceId,
    );
    if (!member) throw new Error("Member is not in the active workspace.");
    const name = patch.name.trim();
    const email = patch.email.trim().toLowerCase();
    if (name.length < 2) throw new Error("Name must have at least two characters.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
    if (
      state.members.some(
        (item) =>
          item.workspaceId === member.workspaceId &&
          item.id !== member.id &&
          item.email.toLowerCase() === email,
      )
    )
      throw new Error("This email already belongs to another workspace member.");
    persist({
      ...state,
      members: state.members.map((item) =>
        item.id === memberId ? { ...item, name, email } : item,
      ),
    });
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
    const next = { ...current, ...patch };
    const allowedStatuses: WorkStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
    if (
      !Number.isInteger(next.sprintLengthDays) ||
      next.sprintLengthDays < 1 ||
      next.sprintLengthDays > 90
    )
      throw new Error("Sprint length must be between 1 and 90 whole days.");
    if (
      !next.statuses.includes("Done") ||
      next.statuses.some((status) => !allowedStatuses.includes(status))
    )
      throw new Error("Workflow statuses must be valid and include Done.");
    if (new Set(next.statuses).size !== next.statuses.length)
      throw new Error("Workflow statuses cannot be duplicated.");
    if (
      !Number.isInteger(next.security.sessionTimeoutMinutes) ||
      next.security.sessionTimeoutMinutes < 5 ||
      next.security.sessionTimeoutMinutes > 1440
    )
      throw new Error("Session timeout must be between 5 and 1,440 minutes.");
    if (
      next.security.allowedRegions.some(
        (region) => !["US-West", "US-East", "EU-Central", "AP-South"].includes(region),
      )
    )
      throw new Error("Choose an available security region.");
    persist({
      ...state,
      settingsByWorkspace: {
        ...state.settingsByWorkspace,
        [workspace.id]: next,
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
  taskId: EntityId,
  title: string,
  assigneeId: EntityId | null,
): DemoState {
  const parent = current.tasks.find((item) => item.id === taskId);
  if (!parent) throw new Error("Task not found.");
  if (parent.parentTaskId) throw new Error("Subtasks cannot have their own subtasks.");
  const text = title.trim();
  if (!text) throw new Error("Subtask title cannot be empty.");
  if (text.length < 3) throw new Error("Subtask title must have at least three characters.");
  const id = `TEM-${current.counters.task + 1}`;
  const subtask: Task = {
    id,
    key: id,
    parentTaskId: parent.id,
    workspaceId: parent.workspaceId,
    projectId: parent.projectId,
    title: text,
    description: "",
    status: "To Do",
    priority: "Medium",
    assigneeId,
    reporterId: parent.reporterId,
    dueDate: null,
    storyPoints: 0,
    sprintId: parent.sprintId,
    labels: [],
    commentIds: [],
    blockedByIds: [],
    blocksIds: [],
    createdAt: DEMO_TODAY,
    updatedAt: DEMO_TODAY,
  };
  return {
    ...current,
    tasks: [...current.tasks, subtask],
    counters: { ...current.counters, task: current.counters.task + 1 },
  };
}

function findProject(projectId: EntityId) {
  const project = state.projects.find(
    (item) => item.id === projectId && item.workspaceId === state.activeWorkspaceId,
  );
  if (!project) throw new Error("Project not found in the active workspace.");
  return project;
}

function findTask(taskId: EntityId) {
  const task = state.tasks.find(
    (item) =>
      (item.id === taskId || item.key === taskId) && item.workspaceId === state.activeWorkspaceId,
  );
  if (!task) throw new Error("Task not found in the active workspace.");
  return task;
}

function findSprint(sprintId: EntityId) {
  const sprint = state.sprints.find(
    (item) => item.id === sprintId && item.workspaceId === state.activeWorkspaceId,
  );
  if (!sprint) throw new Error("Sprint not found in the active workspace.");
  return sprint;
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
    taskFields: ["Story points", "Labels", "Due date"],
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
    candidate.version === 2 &&
    typeof candidate.activeWorkspaceId === "string" &&
    Array.isArray(candidate.workspaces) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.members) &&
    Array.isArray(candidate.sprints) &&
    Array.isArray(candidate.comments) &&
    Array.isArray(candidate.notifications) &&
    !!candidate.settingsByWorkspace &&
    !!candidate.counters
  );
}

interface LegacySubtask {
  id: EntityId;
  issueId: EntityId;
  title: string;
  completed: boolean;
  assigneeId: EntityId | null;
}

function migrateDemoState(value: unknown): DemoState | null {
  if (isDemoState(value)) return value;
  if (!value || typeof value !== "object") return null;
  const legacy = value as {
    version?: unknown;
    activeWorkspaceId?: unknown;
    issues?: unknown;
    subtasks?: unknown;
    comments?: unknown;
    notifications?: unknown;
    settingsByWorkspace?: unknown;
    counters?: unknown;
    [key: string]: unknown;
  };
  if (
    legacy.version !== 1 ||
    !Array.isArray(legacy.issues) ||
    !Array.isArray(legacy.subtasks) ||
    !Array.isArray(legacy.comments) ||
    !Array.isArray(legacy.notifications) ||
    !Array.isArray(legacy.workspaces) ||
    !Array.isArray(legacy.members) ||
    !Array.isArray(legacy.projects) ||
    !Array.isArray(legacy.sprints) ||
    typeof legacy.activeWorkspaceId !== "string" ||
    typeof legacy.activeMemberId !== "string" ||
    !legacy.settingsByWorkspace ||
    !legacy.counters
  )
    return null;

  const oldTasks = legacy.issues as Array<Omit<Task, "parentTaskId"> & { subtaskIds?: EntityId[] }>;
  const oldSubtasks = legacy.subtasks as LegacySubtask[];
  const parentTasks = oldTasks.map((task) => {
    const parent = { ...task, parentTaskId: null };
    delete parent.subtaskIds;
    return parent;
  });
  const childIndexes = new Map<EntityId, number>();
  const childTasks = oldSubtasks.flatMap((subtask) => {
    const parent = parentTasks.find((item) => item.id === subtask.issueId);
    if (!parent) return [];
    const index = (childIndexes.get(parent.id) ?? 0) + 1;
    childIndexes.set(parent.id, index);
    return [
      {
        id: subtask.id,
        key: `${parent.key}-S${index}`,
        parentTaskId: parent.id,
        workspaceId: parent.workspaceId,
        projectId: parent.projectId,
        title: subtask.title,
        description: "",
        status: subtask.completed ? ("Done" as const) : ("To Do" as const),
        priority: "Medium" as const,
        assigneeId: subtask.assigneeId,
        reporterId: parent.reporterId,
        dueDate: null,
        storyPoints: 0,
        sprintId: parent.sprintId,
        labels: [],
        commentIds: [],
        blockedByIds: [],
        blocksIds: [],
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
      },
    ];
  });
  const oldSettings = legacy.settingsByWorkspace as Record<
    EntityId,
    WorkspaceSettings & { issueFields?: string[] }
  >;
  const settingsByWorkspace = Object.fromEntries(
    Object.entries(oldSettings).map(([workspaceId, settings]) => {
      const { issueFields, ...currentSettings } = settings;
      return [
        workspaceId,
        { ...currentSettings, taskFields: settings.taskFields ?? issueFields ?? [] },
      ];
    }),
  );
  const oldCounters = legacy.counters as DemoState["counters"] & {
    issue?: number;
    subtask?: number;
  };
  const comments = (
    legacy.comments as Array<Omit<DemoState["comments"][number], "taskId"> & { issueId: EntityId }>
  ).map(({ issueId, ...comment }) => ({ ...comment, taskId: issueId }));
  const notifications = (
    legacy.notifications as Array<
      Omit<DemoState["notifications"][number], "taskId"> & { issueId: EntityId | null }
    >
  ).map(({ issueId, ...notification }) => ({ ...notification, taskId: issueId }));

  const oldState = legacy as Partial<DemoState>;
  return {
    version: 2,
    activeWorkspaceId: legacy.activeWorkspaceId,
    activeMemberId: oldState.activeMemberId as string,
    workspaces: oldState.workspaces as DemoState["workspaces"],
    members: oldState.members as DemoState["members"],
    projects: oldState.projects as DemoState["projects"],
    tasks: [...parentTasks, ...childTasks],
    sprints: oldState.sprints as DemoState["sprints"],
    comments,
    notifications,
    settingsByWorkspace,
    counters: {
      task: (oldCounters.issue ?? 0) + oldSubtasks.length,
      project: oldCounters.project ?? 0,
      workspace: oldCounters.workspace ?? 0,
      sprint: oldCounters.sprint ?? 0,
      comment: oldCounters.comment ?? 0,
    },
  };
}
